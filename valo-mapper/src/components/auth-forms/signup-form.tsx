"use client";

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
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import Link from "next/link";
import { useState } from "react";
import { FirebaseError } from "@firebase/util";
import { sendEmailVerification } from "firebase/auth";
import { toast } from "sonner";
import { Home } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCreateUser } from "@/hooks/api/use-create-user";

export const SignupForm = ({ ...props }: React.ComponentProps<typeof Card>) => {
  const { signUp, logout } = useFirebaseAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const createUserMutation = useCreateUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const user = await signUp(email, password);
      const idToken = await user.getIdToken();

      await createUserMutation.mutateAsync({
        idToken,
        firebaseUid: user.uid,
        name,
        email,
      });

      await sendEmailVerification(user);

      await logout();

      setError("");

      toast.success(
        "Account created! Please check your email and verify your account before logging in."
      );
    } catch (err) {
      if (err instanceof FirebaseError) {
        if (err.code === "auth/email-already-in-use") {
          setError("An account with this email already exists.");
        } else if (err.code === "auth/invalid-email") {
          setError("Invalid email address.");
        } else if (err.code === "auth/weak-password") {
          setError("Password is too weak.");
        } else {
          setError("Failed to create account. Please try again.");
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle className="flex gap-2 items-center">
          <Button
            variant="outline"
            onClick={() => router.push("/")}
            size="icon"
            className="cursor-pointer"
          >
            <Home />
          </Button>
          Create an account
        </CardTitle>
        <CardDescription>
          Enter your information below to create your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading || createUserMutation.isPending}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading || createUserMutation.isPending}
              />
              <FieldDescription>
                We&apos;ll use this to contact you. We will not share your email
                with anyone else.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading || createUserMutation.isPending}
              />
              <FieldDescription>
                At least 8 characters, with upper & lowercase letters, a number,
                and a special character.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">
                Confirm Password
              </FieldLabel>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading || createUserMutation.isPending}
              />
              <FieldDescription>Please confirm your password.</FieldDescription>
            </Field>
            <FieldGroup>
              <Field>
                <Button
                  type="submit"
                  disabled={loading || createUserMutation.isPending}
                >
                  {loading || createUserMutation.isPending
                    ? "Creating Account..."
                    : "Create Account"}
                </Button>

                {error && (
                  <div className="text-sm text-destructive">{error}</div>
                )}

                <FieldDescription className="px-6 text-center">
                  Already have an account? <Link href="/login">Login</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
};
