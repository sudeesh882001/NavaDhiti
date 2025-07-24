import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LogIn, 
  UserPlus, 
  AlertCircle, 
  CheckCircle,
  Eye,
  EyeOff
} from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Check for OAuth callback tokens in URL
  useEffect(() => {
    const token = searchParams.get('token');
    const userParam = searchParams.get('user');

    if (token && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));

        // Store token and user info
      localStorage.setItem("authToken", token);
      localStorage.setItem("user", JSON.stringify(user));

      // Trigger auth state change event
      window.dispatchEvent(new CustomEvent('authStateChanged'));

      setSuccess("Google sign-in successful! Redirecting...");

      // Clean URL and redirect
      window.history.replaceState({}, document.title, window.location.pathname);

      setTimeout(() => {
        navigate("/");
      }, 1000);

      } catch (error) {
        console.error("Error processing OAuth callback:", error);
        setError("Authentication error. Please try again.");
      }
    }
  }, [searchParams, navigate]);

  // Login form state
  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });

  // Register form state
  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Store token in localStorage
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Trigger auth state change event
      window.dispatchEvent(new CustomEvent('authStateChanged'));

      setSuccess("Login successful! Redirecting...");

      // Redirect to home page after a short delay
      setTimeout(() => {
        navigate("/");
      }, 1000);

    } catch (error) {
      setError(error instanceof Error ? error.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validate passwords match
    if (registerData.password !== registerData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: registerData.username,
          email: registerData.email,
          password: registerData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      // Store token in localStorage
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Trigger auth state change event
      window.dispatchEvent(new CustomEvent('authStateChanged'));

      setSuccess("Registration successful! Redirecting...");

      // Redirect to home page after a short delay
      setTimeout(() => {
        navigate("/");
      }, 1000);

    } catch (error) {
      setError(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
    };

  // Handle Google Sign-in
  const handleGoogleSignIn = async () => {
    console.log('entering');
    try {
      setGoogleLoading(true);
      setError("");

      // Get Google auth URL from backend
      const response = await fetch("/api/auth/google");
      const data = await response.json();

      console.log(data, 'data');

      if (!response.ok) {
        throw new Error(data.error || "Failed to get Google auth URL");
      }

      // Redirect to Google OAuth
      window.location.href = "http://localhost:8080/api/auth/google";
;

    } catch (error) {
      console.error("Google sign-in error:", error);
      setError(error instanceof Error ? error.message : "Google sign-in failed");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome to DevHub</h1>
          <p className="text-muted-foreground">
            Join our community of developers
          </p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <LogIn className="h-5 w-5" />
                  <span>Sign In</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="Enter your email"
                      value={loginData.email}
                      onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={loginData.password}
                        onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                        required
                        disabled={isLoading}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                                </form>

                {/* Google Sign-in */}
                <div className="mt-4">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-4"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading || isLoading}
                  >
                    {googleLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full" />
                        <span>Connecting...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        <span>Continue with Google</span>
                      </div>
                    )}
                  </Button>
                </div>

                <div className="mt-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Admin access: sudeeshsri882001@gmail.com / admin123
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="register" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UserPlus className="h-5 w-5" />
                  <span>Create Account</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-username">Username</Label>
                    <Input
                      id="register-username"
                      type="text"
                      placeholder="Choose a username"
                      value={registerData.username}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, username: e.target.value }))}
                      required
                      disabled={isLoading}
                      minLength={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="Enter your email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="Create a password (min 6 characters)"
                      value={registerData.password}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                      required
                      disabled={isLoading}
                      minLength={6}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password">Confirm Password</Label>
                    <Input
                      id="register-confirm-password"
                      type="password"
                      placeholder="Confirm your password"
                      value={registerData.confirmPassword}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                      disabled={isLoading}
                      minLength={6}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating account..." : "Create Account"}
                  </Button>
                                </form>

                {/* Google Sign-in for Registration */}
                <div className="mt-4">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-4"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading || isLoading}
                  >
                    {googleLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full" />
                        <span>Connecting...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        <span>Continue with Google</span>
                      </div>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Error/Success Messages */}
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mt-4 border-success text-success">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            By signing up, you agree to our{" "}
            <Link to="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
