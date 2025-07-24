import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  MessageSquare, 
  ChevronUp, 
  ChevronDown, 
  Eye, 
  User, 
  Clock,
  CheckCircle,
  TrendingUp,
  Calendar,
  Heart,
  HeartOff,
  Loader2,
  AlertCircle
} from "lucide-react";

const sortOptions = [
  { value: "newest", label: "Newest", icon: Calendar },
  { value: "active", label: "Active", icon: TrendingUp },
  { value: "votes", label: "Most Votes", icon: ChevronUp },
  { value: "unanswered", label: "Unanswered", icon: MessageSquare }
];

export default function Index() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [user, setUser] = useState<any>(null);

  // Check for logged in user
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Fetch questions from API
  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`/api/questions?sort=${sortBy}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch questions");
      }
      
      setQuestions(data.questions || []);
    } catch (error) {
      console.error("Error fetching questions:", error);
      setError(error instanceof Error ? error.message : "Failed to load questions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [sortBy]);

  // Handle voting
  const handleVote = async (questionId: number, voteType: 1 | -1) => {
    if (!user) {
      // Redirect to login if not authenticated
      window.location.href = "/login";
      return;
    }

    try {
      const response = await fetch(`/api/questions/${questionId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`
        },
        body: JSON.stringify({ vote: voteType })
      });

      if (response.ok) {
        // Refresh questions to get updated vote counts
        fetchQuestions();
      }
    } catch (error) {
      console.error("Error voting:", error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "less than an hour ago";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "1 day ago";
    return `${diffInDays} days ago`;
  };

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
            <span className="ml-2 text-lg">Loading questions...</span>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">All Questions</h1>
            <p className="text-muted-foreground">
              {questions.length.toLocaleString()} questions
            </p>
          </div>
          
          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px]">
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
            
            <Link to="/ask">
              <Button className="whitespace-nowrap">
                Ask Question
              </Button>
            </Link>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Questions List */}
        {questions.length === 0 && !loading ? (
          <Card className="text-center py-12">
            <CardContent>
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No questions found</h3>
              <p className="text-muted-foreground mb-4">
                Be the first to ask a question in our community!
              </p>
              <Link to="/ask">
                <Button>Ask the First Question</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {questions.map((question) => (
              <Card key={question.id} className="question-card hover:shadow-lg transition-all duration-200">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:space-x-6">
                    {/* Vote and Stats Column */}
                    <div className="flex lg:flex-col items-center lg:items-end space-x-6 lg:space-x-0 lg:space-y-4 mb-4 lg:mb-0 min-w-[120px]">
                      {/* Vote Count with Like/Dislike */}
                      <div className="flex flex-col items-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVote(question.id, 1)}
                          className={`vote-button p-1 ${!user ? 'cursor-not-allowed opacity-50' : ''}`}
                          disabled={!user}
                        >
                          <ChevronUp className="h-5 w-5" />
                        </Button>
                        <span className="text-lg font-semibold text-foreground">{question.votes || 0}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVote(question.id, -1)}
                          className={`vote-button p-1 ${!user ? 'cursor-not-allowed opacity-50' : ''}`}
                          disabled={!user}
                        >
                          <ChevronDown className="h-5 w-5" />
                        </Button>
                        <span className="text-xs text-muted-foreground">votes</span>
                      </div>
                      
                      {/* Answer Count */}
                      <div className={`flex items-center space-x-1 px-3 py-1 rounded-lg ${
                        question.hasAcceptedAnswer 
                          ? 'bg-success/10 text-success' 
                          : question.answers > 0 
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                      }`}>
                        <div className="flex flex-col items-center">
                          <div className="flex items-center space-x-1">
                            <span className="text-lg font-semibold">{question.answers || 0}</span>
                            {question.hasAcceptedAnswer && (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </div>
                          <span className="text-xs">answers</span>
                        </div>
                      </div>
                      
                      {/* View Count */}
                      <div className="flex items-center space-x-1 text-muted-foreground">
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-medium">{formatNumber(question.views || 0)}</span>
                          <span className="text-xs">views</span>
                        </div>
                      </div>
                    </div>

                    {/* Question Content */}
                    <div className="flex-1 min-w-0">
                      {/* Title */}
                      <Link to={`/question/${question.id}`}>
                        <h3 className="text-lg font-semibold text-foreground hover:text-primary transition-colors mb-2 line-clamp-2">
                          {question.title}
                        </h3>
                      </Link>

                      {/* Body Preview */}
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                        {question.body}
                      </p>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {question.tags && question.tags.map((tag: string, index: number) => (
                          <Badge 
                            key={index} 
                            variant="secondary" 
                            className="tag cursor-pointer"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      {/* Author and Time */}
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <span className="font-medium text-primary">
                            {question.author?.username || "Anonymous"}
                          </span>
                          <span className="text-xs">
                            ({(question.author?.reputation || 0).toLocaleString()} rep)
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>asked {formatTimeAgo(question.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Load More Section */}
        {questions.length > 0 && (
          <div className="mt-12 text-center">
            <Button variant="outline" size="lg" onClick={fetchQuestions}>
              Refresh Questions
            </Button>
            <p className="text-muted-foreground text-sm mt-4">
              Showing {questions.length} questions
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
