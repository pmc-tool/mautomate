import { PROMPT_TEMPLATES, TEMPLATE_CATEGORIES, type PromptTemplate } from "../promptTemplates";
import { cn } from "../../../client/utils";
import { Card, CardContent } from "../../../client/components/ui/card";
import { Badge } from "../../../client/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../client/components/ui/tabs";
import { FileText, Plus } from "lucide-react";

interface PromptTemplateSelectorProps {
  onSelect: (template: PromptTemplate) => void;
}

export function PromptTemplateSelector({ onSelect }: PromptTemplateSelectorProps) {
  return (
    <Tabs defaultValue="all" className="w-full">
      <TabsList className="mb-3 w-full flex-wrap justify-start">
        <TabsTrigger value="all">All</TabsTrigger>
        {TEMPLATE_CATEGORIES.map((cat) => (
          <TabsTrigger key={cat.id} value={cat.id}>
            {cat.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="all">
        <TemplateGrid templates={PROMPT_TEMPLATES} onSelect={onSelect} />
      </TabsContent>

      {TEMPLATE_CATEGORIES.map((cat) => (
        <TabsContent key={cat.id} value={cat.id}>
          <TemplateGrid
            templates={PROMPT_TEMPLATES.filter((t) => t.category === cat.id)}
            onSelect={onSelect}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function TemplateGrid({
  templates,
  onSelect,
}: {
  templates: PromptTemplate[];
  onSelect: (t: PromptTemplate) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {templates.map((tmpl) => (
        <Card
          key={tmpl.id}
          onClick={() => onSelect(tmpl)}
          className={cn(
            "cursor-pointer border transition-all hover:border-primary/50 hover:shadow-sm",
            tmpl.id === "custom-blank" && "border-dashed",
          )}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              {tmpl.id === "custom-blank" ? (
                <Plus className="text-muted-foreground h-4 w-4 shrink-0" />
              ) : (
                <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
              )}
              <span className="text-foreground text-sm font-medium">
                {tmpl.name}
              </span>
              <Badge variant="secondary" className="ml-auto px-1.5 py-0 text-[10px] capitalize">
                {tmpl.suggestedType === "ttv" ? "Text" : "Image"}
              </Badge>
            </div>
            {tmpl.prompt && (
              <p className="text-muted-foreground mt-1.5 line-clamp-2 pl-6 text-xs">
                {tmpl.prompt.slice(0, 120)}...
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
