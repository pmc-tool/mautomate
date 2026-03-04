import { useState, useEffect } from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery } from "wasp/client/operations";
import { getAdminSettings, upsertSetting } from "wasp/client/operations";
import DefaultLayout from "../../admin/layout/DefaultLayout";
import Breadcrumb from "../../admin/layout/Breadcrumb";
import { EXTENSION_REGISTRY } from "../registry";
import { Eye, EyeOff, Save, Puzzle, DollarSign, Key } from "lucide-react";

const SETTINGS_KEY_LABELS: Record<string, string> = {
  "ext.ai-image-generator.novita_api_key": "Novita AI API Key",
  "ext.ai-image-generator.price": "Price ($)",
  "ext.ai-image-generator.stripe_price_id": "Stripe Price ID",
  "platform.openai_api_key": "OpenAI API Key",
};

const PLATFORM_API_KEYS = [
  { key: "platform.openai_api_key", label: "OpenAI API Key", placeholder: "sk-..." },
];

const PRICE_KEYS = new Set(
  EXTENSION_REGISTRY.flatMap((ext) =>
    ext.settingsKeys.filter((k) => k.endsWith(".price"))
  )
);

const STRIPE_PRICE_ID_KEYS = new Set(
  EXTENSION_REGISTRY.flatMap((ext) =>
    ext.settingsKeys.filter((k) => k.endsWith(".stripe_price_id"))
  )
);

export default function AdminExtensionsPage({
  user,
}: {
  user: AuthUser;
}) {
  const {
    data: extSettings,
    isLoading: extLoading,
    error: extError,
  } = useQuery(getAdminSettings, { prefix: "ext." });

  const {
    data: platformSettings,
    isLoading: platformLoading,
  } = useQuery(getAdminSettings, { prefix: "platform." });

  const settings = [...(extSettings || []), ...(platformSettings || [])];
  const isLoading = extLoading || platformLoading;
  const error = extError;

  const [values, setValues] = useState<Record<string, string>>({});
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, "saved" | "error" | null>>({});

  useEffect(() => {
    if (extSettings || platformSettings) {
      const map: Record<string, string> = {};
      for (const s of [...(extSettings || []), ...(platformSettings || [])]) {
        map[s.key] = s.value;
      }
      // Pre-fill default prices for extensions that don't have a saved price
      for (const ext of EXTENSION_REGISTRY) {
        const priceKey = `ext.${ext.id}.price`;
        if (!(priceKey in map) && ext.defaultPrice > 0) {
          map[priceKey] = String(ext.defaultPrice);
        }
      }
      setValues(map);
    }
  }, [extSettings, platformSettings]);

  const handleSave = async (key: string) => {
    setSaving((prev) => ({ ...prev, [key]: true }));
    setSaveStatus((prev) => ({ ...prev, [key]: null }));
    try {
      await upsertSetting({ key, value: values[key] || "" });
      setSaveStatus((prev) => ({ ...prev, [key]: "saved" }));
      setTimeout(() => setSaveStatus((prev) => ({ ...prev, [key]: null })), 2000);
    } catch {
      setSaveStatus((prev) => ({ ...prev, [key]: "error" }));
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  return (
    <DefaultLayout user={user}>
      <Breadcrumb pageName="Extension Settings" />

      <div className="grid grid-cols-1 gap-6">
        {/* Platform API Keys */}
        <div className="bg-card text-card-foreground rounded-lg border p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Platform API Keys</h3>
              <p className="text-muted-foreground text-sm">
                Global API keys used across the platform (chatbot, AI features, etc.)
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {PLATFORM_API_KEYS.map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-sm font-medium mb-1.5 block">{label}</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={visibleKeys[key] ? "text" : "password"}
                      value={values[key] || ""}
                      onChange={(e) =>
                        setValues((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      placeholder={placeholder}
                      className="bg-background border-input w-full rounded-md border px-3 py-2 pr-10 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setVisibleKeys((prev) => ({ ...prev, [key]: !prev[key] }))
                      }
                      className="text-muted-foreground hover:text-foreground absolute right-2.5 top-1/2 -translate-y-1/2"
                    >
                      {visibleKeys[key] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <button
                    onClick={() => handleSave(key)}
                    disabled={saving[key]}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {saving[key] ? "Saving..." : "Save"}
                  </button>
                </div>
                {saveStatus[key] === "saved" && (
                  <p className="mt-1 text-xs text-green-600">Saved successfully</p>
                )}
                {saveStatus[key] === "error" && (
                  <p className="mt-1 text-xs text-red-600">Failed to save</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {EXTENSION_REGISTRY.map((ext) => (
          <div
            key={ext.id}
            className="bg-card text-card-foreground rounded-lg border p-6"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
                <Puzzle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{ext.name}</h3>
                <p className="text-muted-foreground text-sm">
                  {ext.description}
                </p>
              </div>
              <span
                className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  ext.isEnabled
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                }`}
              >
                {ext.isEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>

            <div className="space-y-4">
              {ext.settingsKeys.map((key) => {
                const isPrice = PRICE_KEYS.has(key);
                const isStripePriceId = STRIPE_PRICE_ID_KEYS.has(key);
                return (
                  <div key={key}>
                    <label className="text-sm font-medium mb-1.5 block">
                      {SETTINGS_KEY_LABELS[key] || key}
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        {isPrice ? (
                          <div className="relative">
                            <DollarSign className="text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4" />
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={values[key] || ""}
                              onChange={(e) =>
                                setValues((prev) => ({
                                  ...prev,
                                  [key]: e.target.value,
                                }))
                              }
                              placeholder="0.00"
                              className="bg-background border-input w-full rounded-md border pl-8 pr-3 py-2 text-sm"
                            />
                          </div>
                        ) : isStripePriceId ? (
                          <input
                            type="text"
                            value={values[key] || ""}
                            onChange={(e) =>
                              setValues((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                              }))
                            }
                            placeholder="price_..."
                            className="bg-background border-input w-full rounded-md border px-3 py-2 text-sm"
                          />
                        ) : (
                          <>
                            <input
                              type={visibleKeys[key] ? "text" : "password"}
                              value={values[key] || ""}
                              onChange={(e) =>
                                setValues((prev) => ({
                                  ...prev,
                                  [key]: e.target.value,
                                }))
                              }
                              placeholder="Enter API key..."
                              className="bg-background border-input w-full rounded-md border px-3 py-2 pr-10 text-sm"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setVisibleKeys((prev) => ({
                                  ...prev,
                                  [key]: !prev[key],
                                }))
                              }
                              className="text-muted-foreground hover:text-foreground absolute right-2.5 top-1/2 -translate-y-1/2"
                            >
                              {visibleKeys[key] ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                      <button
                        onClick={() => handleSave(key)}
                        disabled={saving[key]}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
                      >
                        <Save className="h-4 w-4" />
                        {saving[key] ? "Saving..." : "Save"}
                      </button>
                    </div>
                    {isPrice && (
                      <p className="text-muted-foreground mt-1 text-xs">
                        Set to 0 for free. Default: ${ext.defaultPrice}
                      </p>
                    )}
                    {saveStatus[key] === "saved" && (
                      <p className="mt-1 text-xs text-green-600">Saved successfully</p>
                    )}
                    {saveStatus[key] === "error" && (
                      <p className="mt-1 text-xs text-red-600">Failed to save</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {isLoading && (
          <p className="text-muted-foreground text-center">Loading settings...</p>
        )}
        {error && (
          <p className="text-center text-red-600">
            Error loading settings: {(error as Error).message}
          </p>
        )}
      </div>
    </DefaultLayout>
  );
}
