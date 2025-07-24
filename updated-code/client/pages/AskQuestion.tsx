import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { sendAdminNotification } from "@/lib/emailService";
import { 
  X, 
  Plus, 
  HelpCircle, 
  FileText, 
  Tag, 
  Eye,
  AlertCircle,
  CheckCircle
} from "lucide-react";

export default function AskQuestion() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: "",
    body: "",
    tags: [] as string[]
  });
  const [currentTag, setCurrentTag] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Check authentication on component mount
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const user = localStorage.getItem("user");

    if (!token || !user) {
      // Redirect to login if not authenticated
      navigate("/login");
      return;
    }
  }, [navigate]);

  // Popular tags for suggestions
  const popularTags = [
    "javascript", "python", "java", "react", "nodejs", "html", "css", 
    "typescript", "mongodb", "express", "sql", "git", "docker", "aws"
  ];

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !formData.tags.includes(trimmedTag) && formData.tags.length < 5) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, trimmedTag]
      }));
      setCurrentTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (currentTag.trim()) {
        handleAddTag(currentTag);
      }
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    } else if (formData.title.length < 15) {
      newErrors.title = "Title must be at least 15 characters";
    }

    if (!formData.body.trim()) {
      newErrors.body = "Question body is required";
    } else if (formData.body.length < 30) {
      newErrors.body = "Question body must be at least 30 characters";
    }

    if (formData.tags.length === 0) {
      newErrors.tags = "At least one tag is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    
    try {
      const response = await fetch("/api/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(localStorage.getItem("authToken") && {
            "Authorization": `Bearer ${localStorage.getItem("authToken")}`
          })
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          // Authentication failed, redirect to login
          localStorage.removeItem("authToken");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        }
        throw new Error(data.error || "Failed to submit question");
      }

      // Send admin notification email
      try {
        const user = JSON.parse(localStorage.getItem("user") || '{}');
        await sendAdminNotification({
          questionTitle: data.title,
          questionBody: formData.body,
          authorName: user.username || 'Unknown User',
          authorEmail: user.email || 'unknown@email.com',
          tags: formData.tags,
          questionId: data.id
        });
        console.log('Admin notification sent successfully');
      } catch (emailError) {
        console.error('Failed to send admin notification:', emailError);
        // Don't fail the question submission if email fails
      }

      // Successfully created question - show success message and redirect to home
      // Instead of redirecting to the question (which would show "not found" since it needs approval),
      // redirect to home with a success message
      toast({
        title: "Question submitted successfully!",
        description: `Your question "${data.title}" is pending admin approval and will be visible once approved.`,
        variant: "default"
      });
      navigate("/");
      
    } catch (error) {
      console.error("Error submitting question:", error);
      setErrors({ 
        submit: error instanceof Error ? error.message : "Failed to submit question. Please try again." 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Ask a Question</h1>
          <p className="text-muted-foreground">
            Get help from our community of developers
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5" />
                    <span>Title</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="title">
                      Be specific and imagine you're asking a question to another person
                    </Label>
                    <Input
                      id="title"
                      placeholder="e.g. How to implement JWT authentication in Node.js?"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className={errors.title ? "border-destructive focus-ring" : "focus-ring"}
                    />
                    {errors.title && (
                      <p className="text-sm text-destructive flex items-center space-x-1">
                        <AlertCircle className="h-4 w-4" />
                        <span>{errors.title}</span>
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {formData.title.length}/100 characters
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Body */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <HelpCircle className="h-5 w-5" />
                      <span>What are the details of your problem?</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant={previewMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPreviewMode(!previewMode)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {previewMode ? "Edit" : "Preview"}
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="body">
                      Introduce the problem and expand on what you put in the title
                    </Label>
                    {previewMode ? (
                      <div className="min-h-[200px] p-4 border rounded-md bg-muted/50">
                        <div className="prose prose-sm max-w-none">
                          {formData.body ? (
                            <pre className="whitespace-pre-wrap font-sans">{formData.body}</pre>
                          ) : (
                            <p className="text-muted-foreground italic">Preview will appear here...</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <Textarea
                        id="body"
                        placeholder="Describe your problem in detail. Include what you've tried and what you expected to happen..."
                        value={formData.body}
                        onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                        className={`min-h-[200px] resize-y ${errors.body ? "border-destructive focus-ring" : "focus-ring"}`}
                      />
                    )}
                    {errors.body && (
                      <p className="text-sm text-destructive flex items-center space-x-1">
                        <AlertCircle className="h-4 w-4" />
                        <span>{errors.body}</span>
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {formData.body.length} characters
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tags */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Tag className="h-5 w-5" />
                    <span>Tags</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Label>
                      Add up to 5 tags to describe what your question is about
                    </Label>
                    
                    {/* Current Tags */}
                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag, index) => (
                          <Badge 
                            key={index} 
                            variant="secondary" 
                            className="flex items-center space-x-1 px-3 py-1"
                          >
                            <span>{tag}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Tag Input */}
                    <div className="flex space-x-2">
                      <Input
                        placeholder="e.g. javascript, react, nodejs"
                        value={currentTag}
                        onChange={(e) => setCurrentTag(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={formData.tags.length >= 5}
                        className="focus-ring"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleAddTag(currentTag)}
                        disabled={!currentTag.trim() || formData.tags.length >= 5}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {errors.tags && (
                      <p className="text-sm text-destructive flex items-center space-x-1">
                        <AlertCircle className="h-4 w-4" />
                        <span>{errors.tags}</span>
                      </p>
                    )}

                    {/* Popular Tags */}
                    <div>
                      <p className="text-sm font-medium mb-2">Popular tags:</p>
                      <div className="flex flex-wrap gap-2">
                        {popularTags
                          .filter(tag => !formData.tags.includes(tag))
                          .slice(0, 8)
                          .map((tag, index) => (
                            <Button
                              key={index}
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddTag(tag)}
                              disabled={formData.tags.length >= 5}
                              className="text-xs"
                            >
                              {tag}
                            </Button>
                          ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Submit */}
              <div className="flex items-center justify-between">
                <Link to="/">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="min-w-[120px]"
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      <span>Posting...</span>
                    </div>
                  ) : (
                    "Post Question"
                  )}
                </Button>
              </div>

              {errors.submit && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.submit}</AlertDescription>
                </Alert>
              )}
            </form>
          </div>

          {/* Sidebar Tips */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Writing a good question</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                    <span>Summarize your problem in a one-line title</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                    <span>Describe your problem in more detail</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                    <span>Describe what you tried and what you expected to happen</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                    <span>Add relevant tags to help others find your question</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tips for success</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• Search before asking to avoid duplicates</p>
                <p>• Be specific about your environment and versions</p>
                <p>• Include relevant code snippets</p>
                <p>• Accept answers that solve your problem</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
