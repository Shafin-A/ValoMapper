"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { FirebaseError } from "firebase/app";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { sanitizeRedirectPath } from "@/lib/rso";
import { Home } from "lucide-react";
import { useUser } from "@/hooks/api/use-user";

export const LoginForm = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, logout } = useFirebaseAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    data: user,
    isLoading: isUserLoading,
    isError: isUserError,
    error: userError,
  } = useUser();

  useEffect(() => {
    if (user && !isUserLoading) {
      const redirectTo = sanitizeRedirectPath(searchParams.get("redirect"));
      router.push(redirectTo);
    }
  }, [user, isUserLoading, router, searchParams]);

  useEffect(() => {
    if (isUserError && userError) {
      setError(`Failed to load user data: ${userError.message}`);
      setLoading(false);
    }
  }, [isUserError, userError]);

  const rsoClientId = process.env.NEXT_PUBLIC_RSO_CLIENT_ID || "";

  const redirectParam = searchParams.get("redirect") || "/";
  const safeRedirectParam = sanitizeRedirectPath(redirectParam);
  const rsoLink = rsoClientId
    ? `/api/auth/rso/start?redirect=${encodeURIComponent(safeRedirectParam)}`
    : "#";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const firebaseUser = await signIn(email, password);

      if (!firebaseUser.emailVerified) {
        setError(
          "Please verify your email before signing in. Check your inbox for the verification link.",
        );

        await logout();

        setLoading(false);

        return;
      }

      setLoading(false);
    } catch (err: unknown) {
      if (err instanceof FirebaseError) {
        if (err.code === "auth/invalid-credential") {
          setError("Invalid email or password.");
        } else if (err.code === "auth/too-many-requests") {
          setError("Too many failed attempts. Please try again later.");
        } else {
          setError("Failed to log in. Please try again.");
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
      setLoading(false);
    }
  };

  return (
    <div className={className} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="flex gap-2 items-center">
            <Button variant="outline" size="icon" asChild>
              <Link href="/">
                <Home />
              </Link>
            </Button>
            Sign in to your account
          </CardTitle>
          <CardDescription>
            Sign in using one of the methods below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <Button
                  className="w-full bg-[#d3362f] border border-[#d3362f] hover:bg-[#d3362f]/80 text-white"
                  asChild
                  disabled={!rsoClientId}
                >
                  <a
                    href={rsoLink}
                    className="flex items-center justify-center gap-2"
                  >
                    <Image
                      src="/riot_fist.svg"
                      alt="Riot logo"
                      width={24}
                      height={24}
                    />
                    {rsoClientId ? "Sign in with Riot" : "Riot not configured"}
                  </a>
                </Button>
                <FieldDescription className="mt-2 text-center text-xs text-muted-foreground">
                  By signing in, your profile becomes public. Players who
                  haven&apos;t opted in won&apos;t have their data shown.
                </FieldDescription>
              </Field>
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                OR
              </FieldSeparator>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading || isUserLoading}
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Link
                    href="/forgotpassword"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading || isUserLoading}
                />
              </Field>
              <Field>
                <Button type="submit" disabled={loading || isUserLoading}>
                  {loading || isUserLoading ? "Logging in..." : "Login"}
                </Button>

                {error && (
                  <div className="text-sm text-destructive">{error}</div>
                )}

                <FieldDescription className="text-center">
                  Don&apos;t have an account?{" "}
                  <Link href="/signup">Sign up</Link>
                </FieldDescription>

                <FieldDescription className="mt-2 text-center text-xs text-muted-foreground">
                  <Link
                    href="/terms-of-service"
                    className="underline underline-offset-4"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy-policy"
                    className="underline underline-offset-4"
                  >
                    Privacy Policy
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
