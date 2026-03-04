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

  // Website state
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [fetchingUrl, setFetchingUrl] = useState(false);

  // Text state
  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");

  // PDF state
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Q&A state
  const [qaQuestion, setQaQuestion] = useState("");
  const [qaAnswer, setQaAnswer] = useState("");

  const dataItems = chatbot?.data || [];
  const filteredData = dataItems.filter((d: any) => d.type === activeTab);

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
      toast({ title: "Website crawled", description: "Content has been extracted from the website." });
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
      toast({ title: "PDF uploaded", description: `Extracted ${res.data.contentLength} characters of text.` });
      // Trigger refetch
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
      <div>
        <h3 className="text-lg font-semibold">Train</h3>
        <p className="text-muted-foreground text-sm">
          Add data sources to train your chatbot
        </p>
      </div>

      {/* Pill Tab Bar */}
      <div className="flex rounded-full bg-muted p-1">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-all",
              activeTab === id
                ? "bg-background text-foreground shadow"
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
          <>
            <div className="flex gap-2">
              <Input
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
                onKeyDown={(e) => e.key === "Enter" && handleAddWebsite()}
              />
              <Button onClick={handleAddWebsite} disabled={fetchingUrl} size="sm">
                {fetchingUrl ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </>
        )}

        {activeTab === "pdf" && (
          <div
            className="flex min-h-56 flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
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
                <Loader2 className="text-primary mb-3 h-10 w-10 animate-spin" />
                <p className="mb-1 text-sm font-medium">Processing PDF...</p>
                <p className="text-muted-foreground text-xs">Extracting text content</p>
              </>
            ) : (
              <>
                <Upload className="text-muted-foreground mb-3 h-10 w-10" />
                <p className="mb-1 text-sm font-medium">Drop PDF files here</p>
                <p className="text-muted-foreground text-xs">or click to browse (max 10MB)</p>
              </>
            )}
          </div>
        )}

        {activeTab === "text" && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={textTitle}
                onChange={(e) => setTextTitle(e.target.value)}
                placeholder="e.g., About Us"
              />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                rows={4}
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Enter text content..."
              />
            </div>
            <Button onClick={handleAddText} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Text
            </Button>
          </div>
        )}

        {activeTab === "qa" && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Question</Label>
              <Input
                value={qaQuestion}
                onChange={(e) => setQaQuestion(e.target.value)}
                placeholder="What are your business hours?"
              />
            </div>
            <div className="space-y-2">
              <Label>Answer</Label>
              <Textarea
                rows={3}
                value={qaAnswer}
                onChange={(e) => setQaAnswer(e.target.value)}
                placeholder="We are open Monday to Friday, 9am to 5pm."
              />
            </div>
            <Button onClick={handleAddQA} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Q&A
            </Button>
          </div>
        )}

        {/* Data Items List */}
        {filteredData.length > 0 && (
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs uppercase tracking-wide">
              {filteredData.length} {activeTab} item{filteredData.length !== 1 ? "s" : ""}
            </Label>
            <div className="space-y-2">
              {filteredData.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {item.typeValue || item.content?.slice(0, 50) || "Untitled"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={item.status === "trained" ? "success" : "secondary"}>
                      {item.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleDeleteData(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
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
          className="w-full"
        >
          {training ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Training...
            </>
          ) : (
            <>
              <GraduationCap className="mr-2 h-4 w-4" />
              Train Chatbot
            </>
          )}
        </Button>
      )}
    </div>
  );
}
