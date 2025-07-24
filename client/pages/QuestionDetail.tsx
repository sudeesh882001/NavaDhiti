import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ChevronUp, 
  ChevronDown, 
  Eye, 
  User, 
  Clock,
  CheckCircle,
  MessageSquare,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Edit,
  Flag,
  Share2
} from "lucide-react";

interface Comment {
  id: string;
  body: string;
  author: {
    id: string;
    username: string;
    reputation: number;
    avatar?: string;
  };
  votes: number;
  parentCommentId?: string;
  createdAt: string;
  updatedAt: string;
}

interface Answer {
  id: string;
  body: string;
  author: {
    id: string;
    username: string;
    reputation: number;
    avatar?: string;
  };
  votes: number;
  isAccepted: boolean;
  createdAt: string;
  updatedAt: string;
  comments: Comment[];
}

interface Question {
  id: string;
  title: string;
  body: string;
  tags: string[];
  author: {
    id: string;
    username: string;
    reputation: number;
    avatar?: string;
  };
  votes: number;
  answers: number; // This is the count
  answersList: Answer[]; // This is the actual array
  views: number;
  createdAt: string;
  updatedAt: string;
  hasAcceptedAnswer: boolean;
  isApproved: boolean;
  approvedAt?: string;
}

export default function QuestionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);
  const [answerBody, setAnswerBody] = useState("");
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [commentBodies, setCommentBodies] = useState<{[answerId: string]: string}>({});
  const [submittingComments, setSubmittingComments] = useState<{[answerId: string]: boolean}>({});
  const [showCommentForms, setShowCommentForms] = useState<{[answerId: string]: boolean}>({});

  // Check for logged in user
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Fetch question details
  useEffect(() => {
    const fetchQuestion = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError("");
        const response = await fetch(`/api/questions/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError("Question not found");
          } else {
            // Try to get error message from response
            try {
              const errorData = await response.json();
              throw new Error(errorData.error || "Failed to fetch question");
            } catch {
              throw new Error("Failed to fetch question");
            }
          }
          return;
        }

        const data = await response.json();
        setQuestion(data);
      } catch (error) {
        console.error("Error fetching question:", error);
        setError(error instanceof Error ? error.message : "Failed to load question");
      } finally {
        setLoading(false);
      }
    };

    fetchQuestion();
  }, [id]);

  // Handle voting on question
  const handleQuestionVote = async (voteType: 1 | -1) => {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      const response = await fetch(`/api/questions/${id}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`
        },
        body: JSON.stringify({ vote: voteType })
      });

      if (response.ok) {
        const data = await response.json();
        setQuestion(prev => prev ? { ...prev, votes: data.newVoteCount } : null);
      }
    } catch (error) {
      console.error("Error voting:", error);
    }
  };

  // Handle voting on answer
  const handleAnswerVote = async (answerId: string, voteType: 1 | -1) => {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      const response = await fetch(`/api/answers/${answerId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`
        },
        body: JSON.stringify({ vote: voteType })
      });

      if (response.ok) {
        const data = await response.json();
        setQuestion(prev => {
          if (!prev) return null;
          return {
            ...prev,
            answersList: prev.answersList.map(answer =>
              answer.id === answerId
                ? { ...answer, votes: data.newVoteCount }
                : answer
            )
          };
        });
      }
    } catch (error) {
      console.error("Error voting on answer:", error);
    }
  };

  // Submit new answer
  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      navigate("/login");
      return;
    }

    if (!answerBody.trim()) {
      return;
    }

    try {
      setSubmittingAnswer(true);
      const response = await fetch(`/api/questions/${id}/answers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`
        },
        body: JSON.stringify({ body: answerBody })
      });

      if (response.ok) {
        const newAnswer = await response.json();
        // Add empty comments array to new answer
        newAnswer.comments = [];
        setQuestion(prev => {
          if (!prev) return null;
          return {
            ...prev,
            answersList: [...prev.answersList, newAnswer],
            answers: prev.answers + 1
          };
        });
        setAnswerBody("");
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
    } finally {
      setSubmittingAnswer(false);
    }
  };

  // Submit comment to answer
  const handleSubmitComment = async (answerId: string, e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      navigate("/login");
      return;
    }

    const commentBody = commentBodies[answerId];
    if (!commentBody?.trim()) {
      return;
    }

    try {
      setSubmittingComments(prev => ({ ...prev, [answerId]: true }));
      const response = await fetch(`/api/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`
        },
        body: JSON.stringify({ answerId, body: commentBody })
      });

      if (response.ok) {
        const newComment = await response.json();
        setQuestion(prev => {
          if (!prev) return null;
          return {
            ...prev,
            answersList: prev.answersList.map(answer =>
              answer.id === answerId
                ? { ...answer, comments: [...answer.comments, newComment] }
                : answer
            )
          };
        });
        setCommentBodies(prev => ({ ...prev, [answerId]: "" }));
        setShowCommentForms(prev => ({ ...prev, [answerId]: false }));
      }
    } catch (error) {
      console.error("Error submitting comment:", error);
    } finally {
      setSubmittingComments(prev => ({ ...prev, [answerId]: false }));
    }
  };

  // Vote on comment
  const handleCommentVote = async (commentId: string, voteType: 1 | -1) => {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      const response = await fetch(`/api/comments/${commentId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`
        },
        body: JSON.stringify({ vote: voteType })
      });

      if (response.ok) {
        const data = await response.json();
        setQuestion(prev => {
          if (!prev) return null;
          return {
            ...prev,
            answersList: prev.answersList.map(answer => ({
              ...answer,
              comments: answer.comments.map(comment =>
                comment.id === commentId
                  ? { ...comment, votes: data.newVoteCount }
                  : comment
              )
            }))
          };
        });
      }
    } catch (error) {
      console.error("Error voting on comment:", error);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-lg">Loading question...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="mt-4">
            <Link to="/">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Questions
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Question not found</h2>
            <Link to="/">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Questions
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link to="/" className="text-primary hover:underline">
            ← Back to Questions
          </Link>
        </div>

        {/* Question Card */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-foreground mb-4">{question.title}</h1>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span className="flex items-center space-x-1">
                    <Eye className="h-4 w-4" />
                    <span>{question.views} views</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>asked {formatTimeAgo(question.createdAt)}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <User className="h-4 w-4" />
                    <span className="font-medium text-primary">{question.author.username}</span>
                    <span>({question.author.reputation} rep)</span>
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-start space-x-6">
              {/* Voting Column */}
              <div className="flex flex-col items-center space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleQuestionVote(1)}
                  className={`vote-button p-2 ${!user ? 'cursor-not-allowed opacity-50' : ''}`}
                  disabled={!user}
                >
                  <ChevronUp className="h-6 w-6" />
                </Button>
                <span className="text-xl font-bold">{question.votes}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleQuestionVote(-1)}
                  className={`vote-button p-2 ${!user ? 'cursor-not-allowed opacity-50' : ''}`}
                  disabled={!user}
                >
                  <ChevronDown className="h-6 w-6" />
                </Button>
              </div>

              {/* Question Content */}
              <div className="flex-1">
                <div className="prose prose-sm max-w-none mb-6">
                  <p className="whitespace-pre-wrap">{question.body}</p>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {question.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="tag">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Flag className="h-4 w-4 mr-2" />
                    Flag
                  </Button>
                  {user && user.id === question.author.id && (
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Answers Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-6">
            {question.answersList.length} {question.answersList.length === 1 ? 'Answer' : 'Answers'}
          </h2>

          {question.answersList.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No answers yet. Be the first to help!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {question.answersList.map((answer) => (
                <Card key={answer.id} className={answer.isAccepted ? 'border-success' : ''}>
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-6">
                      {/* Voting Column */}
                      <div className="flex flex-col items-center space-y-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAnswerVote(answer.id, 1)}
                          className={`vote-button p-2 ${!user ? 'cursor-not-allowed opacity-50' : ''}`}
                          disabled={!user}
                        >
                          <ChevronUp className="h-5 w-5" />
                        </Button>
                        <span className="text-lg font-semibold">{answer.votes}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAnswerVote(answer.id, -1)}
                          className={`vote-button p-2 ${!user ? 'cursor-not-allowed opacity-50' : ''}`}
                          disabled={!user}
                        >
                          <ChevronDown className="h-5 w-5" />
                        </Button>
                        {answer.isAccepted && (
                          <CheckCircle className="h-6 w-6 text-success" />
                        )}
                      </div>

                      {/* Answer Content */}
                      <div className="flex-1">
                        <div className="prose prose-sm max-w-none mb-4">
                          <p className="whitespace-pre-wrap">{answer.body}</p>
                        </div>

                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm">
                              <Share2 className="h-4 w-4 mr-2" />
                              Share
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Flag className="h-4 w-4 mr-2" />
                              Flag
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowCommentForms(prev => ({ ...prev, [answer.id]: !prev[answer.id] }))}
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Add Comment
                            </Button>
                            {user && user.id === answer.author.id && (
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4" />
                            <span className="font-medium text-primary">{answer.author.username}</span>
                            <span>({answer.author.reputation} rep)</span>
                            <span>•</span>
                            <span>answered {formatTimeAgo(answer.createdAt)}</span>
                          </div>
                        </div>

                        {/* Comments Section */}
                        {answer.comments && answer.comments.length > 0 && (
                          <div className="mt-4 border-t pt-4">
                            <h4 className="text-sm font-medium mb-3 text-muted-foreground">
                              {answer.comments.length} {answer.comments.length === 1 ? 'Comment' : 'Comments'}
                            </h4>
                            <div className="space-y-3">
                              {answer.comments.map((comment) => (
                                <div key={comment.id} className="bg-muted/30 rounded-lg p-3">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <p className="text-sm mb-2">{comment.body}</p>
                                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                        <User className="h-3 w-3" />
                                        <span className="font-medium">{comment.author.username}</span>
                                        <span>({comment.author.reputation} rep)</span>
                                        <span>•</span>
                                        <span>{formatTimeAgo(comment.createdAt)}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-1 ml-4">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleCommentVote(comment.id, 1)}
                                        className="h-6 w-6 p-0"
                                        disabled={!user}
                                      >
                                        <ChevronUp className="h-3 w-3" />
                                      </Button>
                                      <span className="text-xs font-medium">{comment.votes}</span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleCommentVote(comment.id, -1)}
                                        className="h-6 w-6 p-0"
                                        disabled={!user}
                                      >
                                        <ChevronDown className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Comment Form */}
                        {showCommentForms[answer.id] && user && (
                          <div className="mt-4 border-t pt-4">
                            <form onSubmit={(e) => handleSubmitComment(answer.id, e)} className="space-y-3">
                              <Textarea
                                placeholder="Add a comment..."
                                value={commentBodies[answer.id] || ""}
                                onChange={(e) => setCommentBodies(prev => ({ ...prev, [answer.id]: e.target.value }))}
                                className="min-h-[80px] resize-y"
                                required
                              />
                              <div className="flex justify-end space-x-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowCommentForms(prev => ({ ...prev, [answer.id]: false }))}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="submit"
                                  size="sm"
                                  disabled={submittingComments[answer.id] || !commentBodies[answer.id]?.trim()}
                                >
                                  {submittingComments[answer.id] ? (
                                    <>
                                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                      Posting...
                                    </>
                                  ) : (
                                    "Add Comment"
                                  )}
                                </Button>
                              </div>
                            </form>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Answer Form */}
        {user ? (
          <Card>
            <CardHeader>
              <CardTitle>Your Answer</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitAnswer} className="space-y-4">
                <Textarea
                  placeholder="Write your answer here..."
                  value={answerBody}
                  onChange={(e) => setAnswerBody(e.target.value)}
                  className="min-h-[150px] resize-y"
                  required
                />
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={submittingAnswer || !answerBody.trim()}
                  >
                    {submittingAnswer ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Posting...
                      </>
                    ) : (
                      "Post Your Answer"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <h3 className="text-lg font-semibold mb-2">Want to answer this question?</h3>
              <p className="text-muted-foreground mb-4">
                You need to be logged in to post an answer.
              </p>
              <Link to="/login">
                <Button>Sign In to Answer</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
