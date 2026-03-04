(function () {
  "use strict";

  var script = document.currentScript;
  if (!script) return;

  var chatbotId = script.getAttribute("data-chatbot-id");
  if (!chatbotId) return;

  var origin = script.src.replace(/\/(api\/inbox\/widget-script|(chatbot|mAutomate)-widget\.js).*$/, "");

  // Persistent visitor ID
  var visitorId = localStorage.getItem("mAutomate_visitor") || crypto.randomUUID();
  localStorage.setItem("mAutomate_visitor", visitorId);

  var isOpen = false;
  var hasConversation = false; // true once first message sent
  var lastMessageId = "";
  var bgPollTimer = null;
  var config = {
    title: "Chat with us",
    welcomeMessage: "Hi! How can I help you today?",
    bubbleMessage: "",
    avatar: "bot",
    color: "#6366f1",
    position: "right",
    embedWidth: 380,
    embedHeight: 600,
    showLogo: true,
  };

  // ---------------------------------------------------------------------------
  // Avatar SVGs
  // ---------------------------------------------------------------------------
  var avatarSVGs = {
    bot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><line x1="12" y1="7" x2="12" y2="11"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="16" r="1"/></svg>',
    message: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    headphones: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>',
    sparkles: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>',
    cpu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2"/></svg>',
    brain: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M12 5v13"/></svg>',
  };

  function getAvatarHTML(avatarId, size) {
    var s = size || 20;
    var svg = avatarSVGs[avatarId] || avatarSVGs.bot;
    return '<span style="width:' + s + 'px;height:' + s + 'px;display:inline-flex">' + svg + '</span>';
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function hexToRgba(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
  }

  function lightenColor(hex, amount) {
    var r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
    var g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
    var b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
    return "#" + [r, g, b].map(function (c) { return c.toString(16).padStart(2, "0"); }).join("");
  }

  function escapeHtml(str) {
    if (!str) return "";
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------------------------------------------------------------------------
  // Build UI
  // ---------------------------------------------------------------------------
  function buildWidget() {
    var c = config.color;
    var pos = config.position === "left" ? "left" : "right";
    var w = config.embedWidth;
    var h = config.embedHeight;

    var style = document.createElement("style");
    style.textContent = [
      ".ma-widget-btn{position:fixed;bottom:24px;" + pos + ":24px;width:56px;height:56px;border-radius:50%;background:" + c + ";color:#fff;border:none;cursor:pointer;box-shadow:0 4px 14px " + hexToRgba(c, 0.4) + ";display:flex;align-items:center;justify-content:center;z-index:99999;transition:transform .2s,box-shadow .2s}",
      ".ma-widget-btn:hover{transform:scale(1.08);box-shadow:0 6px 20px " + hexToRgba(c, 0.5) + "}",
      ".ma-widget-btn svg{width:26px;height:26px}",
      ".ma-widget-panel{position:fixed;bottom:92px;" + pos + ":24px;width:" + w + "px;height:" + h + "px;max-height:calc(100vh - 120px);max-width:calc(100vw - 32px);border-radius:16px;background:#fff;box-shadow:0 8px 40px rgba(0,0,0,.15);display:none;flex-direction:column;overflow:hidden;z-index:99999;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}",
      ".ma-widget-panel.open{display:flex}",
      ".ma-panel-header{background:linear-gradient(135deg," + c + "," + lightenColor(c, 30) + ");color:#fff;padding:16px 20px;display:flex;align-items:center;gap:12px}",
      ".ma-panel-header .ma-avatar{width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;flex-shrink:0}",
      ".ma-panel-header .ma-avatar svg{stroke:#fff}",
      ".ma-panel-header .ma-info{flex:1;min-width:0}",
      ".ma-panel-header .ma-info h3{margin:0;font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".ma-panel-header .ma-info p{margin:2px 0 0;font-size:12px;opacity:.85}",
      ".ma-panel-header .ma-close{background:none;border:none;color:#fff;cursor:pointer;opacity:.7;padding:4px;font-size:20px;line-height:1}",
      ".ma-panel-header .ma-close:hover{opacity:1}",
      ".ma-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px;background:#f9fafb}",
      ".ma-msg{max-width:80%;padding:10px 14px;border-radius:14px;font-size:14px;line-height:1.5;word-wrap:break-word}",
      ".ma-msg.contact{align-self:flex-end;background:" + c + ";color:#fff;border-bottom-right-radius:4px}",
      ".ma-msg.bot{align-self:flex-start;background:#fff;color:#1f2937;border:1px solid #e5e7eb;border-bottom-left-radius:4px}",
      ".ma-msg.system{align-self:center;background:#fef3c7;color:#92400e;font-size:12px;border-radius:8px;padding:6px 12px}",
      ".ma-typing{align-self:flex-start;padding:10px 16px;display:none;gap:4px}",
      ".ma-typing.show{display:flex}",
      ".ma-typing span{width:6px;height:6px;border-radius:50%;background:#9ca3af;animation:ma-bounce .6s infinite alternate}",
      ".ma-typing span:nth-child(2){animation-delay:.15s}",
      ".ma-typing span:nth-child(3){animation-delay:.3s}",
      "@keyframes ma-bounce{to{opacity:.3;transform:translateY(-4px)}}",
      ".ma-composer{display:flex;align-items:center;gap:8px;padding:12px 16px;border-top:1px solid #e5e7eb;background:#fff}",
      ".ma-composer input{flex:1;border:1px solid #e5e7eb;border-radius:24px;padding:8px 16px;font-size:14px;outline:none;font-family:inherit}",
      ".ma-composer input:focus{border-color:" + c + "}",
      ".ma-composer button{width:36px;height:36px;border-radius:50%;background:" + c + ";color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}",
      ".ma-composer button:disabled{background:#d1d5db;cursor:not-allowed}",
      ".ma-welcome{text-align:center;padding:40px 20px;color:#6b7280}",
      ".ma-welcome .ma-welcome-avatar{width:56px;height:56px;border-radius:50%;background:" + hexToRgba(c, 0.1) + ";display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px}",
      ".ma-welcome .ma-welcome-avatar svg{stroke:" + c + "}",
      ".ma-welcome h4{margin:0 0 4px;font-size:16px;font-weight:600;color:#1f2937}",
      ".ma-welcome p{margin:0;font-size:13px;line-height:1.5}",
      ".ma-bubble-msg{position:fixed;bottom:88px;" + pos + ":24px;background:#fff;border-radius:12px;padding:10px 16px;box-shadow:0 4px 16px rgba(0,0,0,.12);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;color:#374151;max-width:240px;z-index:99998;animation:ma-fadeIn .3s ease}",
      ".ma-bubble-msg .ma-bubble-close{position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:#e5e7eb;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;line-height:1;color:#6b7280}",
      ".ma-bubble-msg .ma-bubble-close:hover{background:#d1d5db}",
      "@keyframes ma-fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}",
      ".ma-powered{text-align:center;padding:4px;font-size:10px;color:#9ca3af;background:#fff;border-top:1px solid #f3f4f6}",
      ".ma-powered a{color:#6b7280;text-decoration:none}",
      ".ma-powered a:hover{color:#374151}",
    ].join("\n");
    document.head.appendChild(style);

    // Float button
    var btn = document.createElement("button");
    btn.className = "ma-widget-btn";
    btn.setAttribute("aria-label", "Open chat");
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
    document.body.appendChild(btn);

    // Bubble message
    var bubbleEl = null;
    if (config.bubbleMessage) {
      bubbleEl = document.createElement("div");
      bubbleEl.className = "ma-bubble-msg";
      bubbleEl.innerHTML = escapeHtml(config.bubbleMessage) + '<button class="ma-bubble-close">&times;</button>';
      document.body.appendChild(bubbleEl);
      bubbleEl.querySelector(".ma-bubble-close").addEventListener("click", function (e) {
        e.stopPropagation();
        bubbleEl.remove();
        bubbleEl = null;
      });
    }

    // Panel
    var panel = document.createElement("div");
    panel.className = "ma-widget-panel";
    panel.innerHTML = [
      '<div class="ma-panel-header">',
      '  <div class="ma-avatar">' + getAvatarHTML(config.avatar, 22) + '</div>',
      '  <div class="ma-info"><h3>' + escapeHtml(config.title) + '</h3><p>Online</p></div>',
      '  <button class="ma-close" aria-label="Close">&times;</button>',
      "</div>",
      '<div class="ma-messages" id="ma-msgs">',
      '  <div class="ma-welcome">',
      '    <div class="ma-welcome-avatar">' + getAvatarHTML(config.avatar, 28) + '</div>',
      '    <h4>' + escapeHtml(config.title) + '</h4>',
      '    <p>' + escapeHtml(config.welcomeMessage) + '</p>',
      '  </div>',
      "</div>",
      '<div class="ma-typing" id="ma-typing"><span></span><span></span><span></span></div>',
      '<div class="ma-composer">',
      '  <input id="ma-input" type="text" placeholder="Type a message..." autocomplete="off" />',
      '  <button id="ma-send" aria-label="Send">',
      '    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
      "  </button>",
      "</div>",
      config.showLogo !== false ? '<div class="ma-powered">Powered by <a href="https://mautomate.ai" target="_blank" rel="noopener">mAutomate</a></div>' : "",
    ].join("");
    document.body.appendChild(panel);

    var msgsEl = panel.querySelector("#ma-msgs");
    var inputEl = panel.querySelector("#ma-input");
    var sendBtn = panel.querySelector("#ma-send");
    var closeBtn = panel.querySelector(".ma-close");
    var typingEl = panel.querySelector("#ma-typing");

    // Toggle
    function toggle() {
      isOpen = !isOpen;
      panel.classList.toggle("open", isOpen);
      if (isOpen) {
        inputEl.focus();
        if (bubbleEl) { bubbleEl.remove(); bubbleEl = null; }
        // Start background polling when chat is open and there's an active conversation
        if (hasConversation) startBgPoll();
      } else {
        stopBgPoll();
      }
    }

    btn.addEventListener("click", toggle);
    closeBtn.addEventListener("click", toggle);

    // ── Messages ──
    function appendMsg(text, type) {
      var welcome = msgsEl.querySelector(".ma-welcome");
      if (welcome) welcome.remove();
      // Always hide typing when a reply arrives
      if (type === "bot" || type === "system") {
        typingEl.classList.remove("show");
        waitingForReply = false;
      }
      var div = document.createElement("div");
      div.className = "ma-msg " + type;
      div.textContent = text;
      msgsEl.appendChild(div);
      msgsEl.scrollTop = msgsEl.scrollHeight;
    }

    function showTyping() { typingEl.classList.add("show"); msgsEl.scrollTop = msgsEl.scrollHeight; }
    function hideTyping() { typingEl.classList.remove("show"); }

    // ── Send ──
    var waitingForReply = false;

    function sendMessage() {
      var text = inputEl.value.trim();
      if (!text) return;
      inputEl.value = "";
      appendMsg(text, "contact");
      showTyping();
      waitingForReply = true;

      fetch(origin + "/api/inbox/widget/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatbotId: chatbotId,
          content: text,
          contentType: "text",
          visitorId: visitorId,
          senderName: "Website Visitor",
        }),
      })
        .then(function (res) { return res.json(); })
        .then(function () {
          hasConversation = true;
          // Start fast polling to catch the AI/agent reply quickly
          fastPoll(0);
        })
        .catch(function (err) {
          hideTyping();
          waitingForReply = false;
          console.error("[mAutomate Widget] Send error:", err);
          appendMsg("Sorry, something went wrong. Please try again.", "system");
        });
    }

    sendBtn.addEventListener("click", sendMessage);
    inputEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter") sendMessage();
    });

    // ── Polling ──
    // Fast polling: after sending a message, poll rapidly (1.5s) to catch AI/agent reply
    function fastPoll(attempt) {
      if (attempt >= 40) {
        // After 60 seconds of fast polling, fall back to background polling
        hideTyping();
        waitingForReply = false;
        startBgPoll();
        return;
      }
      setTimeout(function () {
        fetchNewMessages(function (gotMessages) {
          if (gotMessages) {
            hideTyping();
            waitingForReply = false;
            startBgPoll(); // Switch to background polling
          } else {
            fastPoll(attempt + 1); // Keep fast polling
          }
        });
      }, 1500);
    }

    // Background polling: check every 5 seconds for new messages (agent replies, etc.)
    function startBgPoll() {
      stopBgPoll();
      if (!isOpen || !hasConversation) return;
      bgPollTimer = setInterval(function () {
        fetchNewMessages(function (got) {
          if (got) hideTyping(); // safety: always hide typing when reply arrives
        });
      }, 5000);
    }

    function stopBgPoll() {
      if (bgPollTimer) { clearInterval(bgPollTimer); bgPollTimer = null; }
    }

    // Shared fetch logic
    function fetchNewMessages(callback) {
      fetch(origin + "/api/inbox/widget/messages?" +
        "chatbotId=" + encodeURIComponent(chatbotId) +
        "&visitorId=" + encodeURIComponent(visitorId) +
        "&after=" + encodeURIComponent(lastMessageId))
        .then(function (res) { return res.json(); })
        .then(function (data) {
          var got = false;
          if (data.messages && data.messages.length > 0) {
            got = true;
            data.messages.forEach(function (msg) {
              if (msg.senderType !== "contact") {
                appendMsg(msg.content, msg.senderType === "system" ? "system" : "bot");
              }
              lastMessageId = msg.id;
            });
          }
          callback(got);
        })
        .catch(function () { callback(false); });
    }
  }

  // ---------------------------------------------------------------------------
  // Init — fetch config then build widget
  // ---------------------------------------------------------------------------
  fetch(origin + "/api/inbox/widget/config?chatbotId=" + encodeURIComponent(chatbotId))
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data.title) config.title = data.title;
      if (data.welcomeMessage) config.welcomeMessage = data.welcomeMessage;
      if (data.bubbleMessage) config.bubbleMessage = data.bubbleMessage;
      if (data.avatar) config.avatar = data.avatar;
      if (data.color) config.color = data.color;
      if (data.position) config.position = data.position;
      if (data.embedWidth) config.embedWidth = data.embedWidth;
      if (data.embedHeight) config.embedHeight = data.embedHeight;
      if (data.showLogo !== undefined) config.showLogo = data.showLogo;
      buildWidget();
    })
    .catch(function (err) {
      console.warn("[mAutomate Widget] Could not load config, using defaults:", err);
      buildWidget();
    });
})();
