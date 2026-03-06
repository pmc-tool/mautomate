import { useState, useRef } from "react";
import { addChatbotData, deleteChatbotData, trainChatbot } from "wasp/client/operations";
import { api } from "wasp/client/api";
import { Button } from "../../client/components/ui/button";
import { Input } from "../../client/components/ui/input";
import { Label } from "../../client/components/ui/label";
import { Textarea } from "../../client/components/ui/textarea";
import { Badge } from "../../client/components/ui/badge";
import { cn } from "../../client/utils";
import {
  Globe,
  FileText,
  Type,
  HelpCircle,
  Plus,
  Trash2,
  Loader2,
  GraduationCap,
  Upload,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { useToast } from "../../client/hooks/use-toast";

interface WizardStepTrainProps {
  chatbotId: string;
  chatbot: any;
}

const TABS = [
  { id: "website", label: "Website", Icon: Globe },
  { id: "pdf", label: "PDF", Icon: FileText },
  { id: "text", label: "Text", Icon: Type },
  { id: "qa", label: "Q&A", Icon: HelpCircle },
];

export default function WizardStepTrain({ chatbotId, chatbot }: WizardStepTrainProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("website");
  const [training, setTraining] = useState(false);

  const [websiteUrl, setWebsiteUrl] = useState("");
  const [fetchingUrl, setFetchingUrl] = useState(false);

  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");

  const [uploadingPdf, setUploadingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [qaQuestion, setQaQuestion] = useState("");
  const [qaAnswer, setQaAnswer] = useState("");

  const dataItems = chatbot?.data || [];
  const filteredData = dataItems.filter((d: any) => d.type === activeTab);
  const trainedCount = dataItems.filter((d: any) => d.status === "trained").length;
  const totalCount = dataItems.length;

  const handleAddWebsite = async () => {
    if (!websiteUrl.trim()) return;
    setFetchingUrl(true);
    try {
      await addChatbotData({
        chatbotId,
        type: "website",
        typeValue: websiteUrl.trim(),
        content: "",
      });
      setWebsiteUrl("");
      toast({ title: "Website crawled", description: "Content has been extracted." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setFetchingUrl(false);
    }
  };

  const handleAddText = async () => {
    if (!textTitle.trim() || !textContent.trim()) return;
    try {
      await addChatbotData({
        chatbotId,
        type: "text",
        typeValue: textTitle.trim(),
        content: textContent.trim(),
      });
      setTextTitle("");
      setTextContent("");
      toast({ title: "Text added" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleAddQA = async () => {
    if (!qaQuestion.trim() || !qaAnswer.trim()) return;
    try {
      await addChatbotData({
        chatbotId,
        type: "qa",
        typeValue: qaQuestion.trim(),
        content: qaAnswer.trim(),
      });
      setQaQuestion("");
      setQaAnswer("");
      toast({ title: "Q&A added" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast({ title: "Invalid file", description: "Only PDF files are allowed", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum 10MB allowed", variant: "destructive" });
      return;
    }
    setUploadingPdf(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("chatbotId", chatbotId);
      const res = await api.post("/api/chatbot/upload-pdf", formData);
      toast({ title: "PDF uploaded", description: `Extracted ${res.data.contentLength} characters.` });
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message;
      toast({ title: "Upload failed", description: msg, variant: "destructive" });
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleDeleteData = async (dataId: string) => {
    try {
      await deleteChatbotData({ id: dataId });
      toast({ title: "Item removed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleTrain = async () => {
    setTraining(true);
    try {
      await trainChatbot({ id: chatbotId });
      toast({ title: "Training complete", description: "Your chatbot has been trained successfully." });
    } catch (err: any) {
      toast({ title: "Training failed", description: err.message, variant: "destructive" });
    } finally {
      setTraining(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Training Status */}
      {totalCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border p-4 bg-muted/30">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Training Data</p>
            <p className="text-xs text-muted-foreground">
              {trainedCount} of {totalCount} items trained
            </p>
          </div>
          <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: totalCount > 0 ? `${(trainedCount / totalCount) * 100}%` : "0%" }}
            />
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex rounded-xl bg-muted p-1 gap-1">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-medium transition-all",
              activeTab === id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === "website" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground/60">Enter a website URL to crawl and extract content for training.</p>
            <div className="flex gap-2">
              <Input
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
                onKeyDown={(e) => e.key === "Enter" && handleAddWebsite()}
                className="h-11 rounded-xl"
              />
              <Button onClick={handleAddWebsite} disabled={fetchingUrl} className="h-11 rounded-xl px-5">
                {fetchingUrl ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        {activeTab === "pdf" && (
          <div
            className={cn(
              "flex min-h-[200px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 cursor-pointer transition-all",
              uploadingPdf
                ? "border-primary/50 bg-primary/5"
                : "hover:border-primary/50 hover:bg-muted/30"
            )}
            onClick={() => !uploadingPdf && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handlePdfUpload}
            />
            {uploadingPdf ? (
              <>
                <Loader2 className="text-primary mb-3 h-12 w-12 animate-spin" />
                <p className="mb-1 text-sm font-medium">Processing PDF...</p>
                <p className="text-muted-foreground text-xs">Extracting text content</p>
              </>
            ) : (
              <>
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Upload className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="mb-1 text-sm font-medium">Drop PDF files here</p>
                <p className="text-muted-foreground text-xs">or click to browse (max 10MB)</p>
              </>
            )}
          </div>
        )}

        {activeTab === "text" && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground/60">Add custom text content to train your chatbot.</p>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Title</Label>
              <Input
                value={textTitle}
                onChange={(e) => setTextTitle(e.target.value)}
                placeholder="e.g., About Us"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Content</Label>
              <Textarea
                rows={5}
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Enter text content..."
                className="rounded-xl resize-none"
              />
            </div>
            <Button onClick={handleAddText} className="w-full h-10 rounded-xl" disabled={!textTitle.trim() || !textContent.trim()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Text
            </Button>
          </div>
        )}

        {activeTab === "qa" && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground/60">Add question and answer pairs for precise responses.</p>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Question</Label>
              <Input
                value={qaQuestion}
                onChange={(e) => setQaQuestion(e.target.value)}
                placeholder="What are your business hours?"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Answer</Label>
              <Textarea
                rows={3}
                value={qaAnswer}
                onChange={(e) => setQaAnswer(e.target.value)}
                placeholder="We are open Monday to Friday, 9am to 5pm."
                className="rounded-xl resize-none"
              />
            </div>
            <Button onClick={handleAddQA} className="w-full h-10 rounded-xl" disabled={!qaQuestion.trim() || !qaAnswer.trim()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Q&A
            </Button>
          </div>
        )}

        {/* Data Items List */}
        {filteredData.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {filteredData.length} {activeTab} item{filteredData.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-1.5">
              {filteredData.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors hover:bg-muted/30"
                >
                  <div className="flex-shrink-0">
                    {item.status === "trained" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {item.typeValue || item.content?.slice(0, 50) || "Untitled"}
                    </p>
                  </div>
                  <Badge
                    variant={item.status === "trained" ? "success" : "secondary"}
                    className="text-[10px] px-2"
                  >
                    {item.status}
                  </Badge>
                  <button
                    className="flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors p-1 rounded-lg hover:bg-destructive/10"
                    onClick={() => handleDeleteData(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Train Button */}
      {dataItems.length > 0 && (
        <Button
          onClick={handleTrain}
          disabled={training}
          className="w-full h-12 rounded-xl text-sm font-medium"
          variant={training ? "outline" : "default"}
        >
          {training ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Training in progress...
            </>
          ) : (
            <>
              <GraduationCap className="mr-2 h-5 w-5" />
              Train Chatbot
            </>
          )}
        </Button>
      )}
    </div>
  );
}
