import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  Tag, 
  TrendingUp, 
  Calendar, 
  BarChart3,
  Users,
  MessageSquare,
  Hash,
  Loader2
} from "lucide-react";

interface TagData {
  name: string;
  questionCount: number;
  todayCount: number;
  weekCount: number;
}

const sortOptions = [
  { value: "popular", label: "Most Popular", icon: TrendingUp },
  { value: "name", label: "Name", icon: Hash },
  { value: "new", label: "Most Recent", icon: Calendar },
  { value: "active", label: "Most Active", icon: BarChart3 }
];

export default function Tags() {
  const [tags, setTags] = useState<TagData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("popular");
  const [filteredTags, setFilteredTags] = useState<TagData[]>([]);

  // Fetch questions and extract tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/questions');
        const data = await response.json();
        
        if (response.ok && data.questions) {
          // Extract and count tags from questions
          const tagCounts = new Map<string, { count: number; recent: Date[] }>();
          
          data.questions.forEach((question: any) => {
            if (question.tags && Array.isArray(question.tags)) {
              const questionDate = new Date(question.createdAt);
              
              question.tags.forEach((tag: string) => {
                if (!tagCounts.has(tag)) {
                  tagCounts.set(tag, { count: 0, recent: [] });
                }
                const tagData = tagCounts.get(tag)!;
                tagData.count++;
                tagData.recent.push(questionDate);
              });
            }
          });
          
          // Convert to array and calculate time-based counts
          const now = new Date();
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          
          const tagsArray: TagData[] = Array.from(tagCounts.entries()).map(([name, data]) => {
            const todayCount = data.recent.filter(date => date >= todayStart).length;
            const weekCount = data.recent.filter(date => date >= weekStart).length;
            
            return {
              name,
              questionCount: data.count,
              todayCount,
              weekCount
            };
          });
          
          setTags(tagsArray);
        } else {
          setTags([]);
        }
      } catch (error) {
        console.error('Error fetching tags:', error);
        setTags([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTags();
  }, []);

  // Filter and sort tags
  useEffect(() => {
    let filtered = tags.filter(tag =>
      tag.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort tags
    switch (sortBy) {
      case "name":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "new":
        filtered.sort((a, b) => b.todayCount - a.todayCount);
        break;
      case "active":
        filtered.sort((a, b) => b.weekCount - a.weekCount);
        break;
      default: // popular
        filtered.sort((a, b) => b.questionCount - a.questionCount);
    }

    setFilteredTags(filtered);
  }, [searchQuery, sortBy, tags]);

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-lg">Loading tags...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Tags</h1>
          <p className="text-muted-foreground">
            Browse questions by tags to find topics you're interested in
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center space-x-2">
                    <option.icon className="h-4 w-4" />
                    <span>{option.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tags Grid */}
        {filteredTags.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {tags.length === 0 ? "No tags yet" : "No tags found"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {tags.length === 0 
                  ? "Tags will appear here once questions are posted with tags."
                  : "Try adjusting your search terms or browse all available tags."
                }
              </p>
              {tags.length === 0 ? (
                <Link to="/ask">
                  <Button>Ask the First Question</Button>
                </Link>
              ) : (
                <Button variant="outline" onClick={() => setSearchQuery("")}>
                  Show All Tags
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTags.map((tag) => (
              <Card key={tag.name} className="hover:shadow-lg transition-all duration-200 cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-lg px-3 py-1 font-mono">
                      {tag.name}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Question Count */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Questions</span>
                      </div>
                      <span className="font-semibold">{formatNumber(tag.questionCount)}</span>
                    </div>
                    
                    {/* Activity Stats */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Today:</span>
                        <span className="font-medium">{tag.todayCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">This week:</span>
                        <span className="font-medium">{tag.weekCount}</span>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex space-x-2 pt-2">
                      <Link to={`/?tag=${tag.name}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Tag className="h-4 w-4 mr-2" />
                          View Questions
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Stats Summary */}
        {tags.length > 0 && (
          <div className="mt-12 grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="text-center py-6">
                <div className="text-2xl font-bold text-primary">{tags.length}</div>
                <div className="text-sm text-muted-foreground">Total Tags</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="text-center py-6">
                <div className="text-2xl font-bold text-primary">
                  {formatNumber(tags.reduce((sum, tag) => sum + tag.questionCount, 0))}
                </div>
                <div className="text-sm text-muted-foreground">Tagged Questions</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="text-center py-6">
                <div className="text-2xl font-bold text-primary">
                  {tags.reduce((sum, tag) => sum + tag.todayCount, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Questions Today</div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
