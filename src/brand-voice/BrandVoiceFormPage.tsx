import { type AuthUser } from "wasp/auth";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "wasp/client/operations";
import { getCompany, createCompany, updateCompany } from "wasp/client/operations";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Megaphone,
} from "lucide-react";
import { Button } from "../client/components/ui/button";
import { Input } from "../client/components/ui/input";
import { Label } from "../client/components/ui/label";
import { Textarea } from "../client/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../client/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../client/components/ui/card";
import { Separator } from "../client/components/ui/separator";
import { toast } from "../client/hooks/use-toast";
import UserDashboardLayout from "../user-dashboard/layout/UserDashboardLayout";

const TONES = [
  "Professional",
  "Casual",
  "Funny",
  "Excited",
  "Witty",
  "Sarcastic",
  "Feminine",
  "Masculine",
  "Bold",
  "Dramatic",
  "Grumpy",
  "Secretive",
] as const;

const PRODUCT_TYPES = [
  { value: 0, label: "Product" },
  { value: 1, label: "Service" },
  { value: 2, label: "Other" },
] as const;

interface ProductForm {
  name: string;
  type: number;
  keyFeatures: string;
}

function emptyProduct(): ProductForm {
  return { name: "", type: 0, keyFeatures: "" };
}

export default function BrandVoiceFormPage({ user }: { user: AuthUser }) {
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const isEdit = !!params.id;

  const { data: existing, isLoading: loadingExisting } = useQuery(
    getCompany,
    isEdit ? { id: params.id! } : undefined,
    { enabled: isEdit },
  );

  // Form state
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [website, setWebsite] = useState("");
  const [tagline, setTagline] = useState("");
  const [toneOfVoice, setToneOfVoice] = useState("");
  const [brandColor, setBrandColor] = useState("#8fd2d0");
  const [specificInstructions, setSpecificInstructions] = useState("");
  const [products, setProducts] = useState<ProductForm[]>([]);
  const [saving, setSaving] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (existing) {
      setName(existing.name ?? "");
      setIndustry(existing.industry ?? "");
      setDescription(existing.description ?? "");
      setTargetAudience(existing.targetAudience ?? "");
      setWebsite(existing.website ?? "");
      setTagline(existing.tagline ?? "");
      setToneOfVoice(existing.toneOfVoice ?? "");
      setBrandColor(existing.brandColor ?? "#8fd2d0");
      setSpecificInstructions(existing.specificInstructions ?? "");
      setProducts(
        existing.products?.map((p: any) => ({
          name: p.name ?? "",
          type: p.type ?? 0,
          keyFeatures: p.keyFeatures ?? "",
        })) ?? [],
      );
    }
  }, [existing]);

  function addProduct() {
    setProducts((prev) => [...prev, emptyProduct()]);
  }

  function removeProduct(index: number) {
    setProducts((prev) => prev.filter((_, i) => i !== index));
  }

  function updateProduct(index: number, field: keyof ProductForm, value: string | number) {
    setProducts((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      toast({ title: "Validation", description: "Company name is required.", variant: "destructive" });
      return;
    }
    if (!description.trim()) {
      toast({ title: "Validation", description: "Description is required.", variant: "destructive" });
      return;
    }

    // Filter out empty product rows
    const validProducts = products.filter((p) => p.name.trim());

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        industry: industry.trim() || null,
        description: description.trim(),
        targetAudience: targetAudience.trim() || null,
        website: website.trim() || null,
        tagline: tagline.trim() || null,
        toneOfVoice: toneOfVoice || null,
        brandColor: brandColor || null,
        specificInstructions: specificInstructions.trim() || null,
        products: validProducts.map((p) => ({
          name: p.name.trim(),
          type: p.type,
          keyFeatures: p.keyFeatures.trim() || null,
        })),
      };

      if (isEdit) {
        await updateCompany({ ...payload, id: params.id! });
        toast({ title: "Updated", description: `${name} has been updated.` });
      } else {
        await createCompany(payload);
        toast({ title: "Created", description: `${name} has been created.` });
      }

      navigate("/brand-voice");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message ?? "Failed to save. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  if (isEdit && loadingExisting) {
    return (
      <UserDashboardLayout user={user}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </UserDashboardLayout>
    );
  }

  return (
    <UserDashboardLayout user={user}>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => navigate("/brand-voice")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-foreground text-2xl font-bold flex items-center gap-2">
              <Megaphone className="h-6 w-6 text-primary" />
              {isEdit ? "Edit Company" : "New Company"}
            </h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {isEdit
                ? "Update your company profile and brand voice settings."
                : "Define your company profile to shape how AI writes for your brand."}
            </p>
          </div>
        </div>

        {/* Company Info */}
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>
              Basic details about your company that help AI understand your brand.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Acme Inc."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="Technology, SaaS, Marketing (comma-separated)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what your company does, its mission, and values..."
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Your company's catchphrase or slogan"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetAudience">Target Audience</Label>
              <Textarea
                id="targetAudience"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="Describe your ideal customers, their demographics, interests..."
                rows={2}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="toneOfVoice">Tone of Voice</Label>
                <Select value={toneOfVoice} onValueChange={setToneOfVoice}>
                  <SelectTrigger id="toneOfVoice">
                    <SelectValue placeholder="Select a tone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TONES.map((tone) => (
                      <SelectItem key={tone} value={tone}>
                        {tone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="brandColor">Brand Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="brandColor"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="h-9 w-12 rounded border cursor-pointer"
                  />
                  <Input
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    placeholder="#8fd2d0"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="specificInstructions">Specific Instructions</Label>
              <Textarea
                id="specificInstructions"
                value={specificInstructions}
                onChange={(e) => setSpecificInstructions(e.target.value)}
                placeholder="Custom writing rules: banned words, sentence structure preferences, stylistic guidelines..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Define specific writing rules the AI should follow when generating content for this brand.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Products / Services */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Products & Services</CardTitle>
                <CardDescription>
                  Add the products or services you want AI to reference in generated content.
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addProduct}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {products.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No products or services added yet. Click "Add" to get started.
              </div>
            ) : (
              products.map((product, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 space-y-3 relative group"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    onClick={() => removeProduct(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-8">
                    <div className="space-y-1.5">
                      <Label>Name</Label>
                      <Input
                        value={product.name}
                        onChange={(e) => updateProduct(index, "name", e.target.value)}
                        placeholder="Product or service name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Type</Label>
                      <Select
                        value={String(product.type)}
                        onValueChange={(v) => updateProduct(index, "type", Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRODUCT_TYPES.map((t) => (
                            <SelectItem key={t.value} value={String(t.value)}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Key Features</Label>
                    <Textarea
                      value={product.keyFeatures}
                      onChange={(e) => updateProduct(index, "keyFeatures", e.target.value)}
                      placeholder="Describe the main features, benefits, or capabilities..."
                      rows={2}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/brand-voice")}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            {isEdit ? "Update Company" : "Create Company"}
          </Button>
        </div>
      </form>
    </UserDashboardLayout>
  );
}
