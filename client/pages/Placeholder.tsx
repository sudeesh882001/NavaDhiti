import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction, ArrowLeft } from "lucide-react";

interface PlaceholderProps {
  title: string;
  description: string;
  suggestions?: string[];
}

export default function Placeholder({ title, description, suggestions = [] }: PlaceholderProps) {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card className="text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <Construction className="h-16 w-16 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">{title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground text-lg">
              {description}
            </p>
            
            {suggestions.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium">This page will include:</p>
                <ul className="text-muted-foreground space-y-1">
                  {suggestions.map((suggestion, index) => (
                    <li key={index}>• {suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="flex justify-center space-x-4">
              <Link to="/">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Questions
                </Button>
              </Link>
              <Button disabled>
                Coming Soon
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Continue prompting to have this page implemented with full functionality.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
