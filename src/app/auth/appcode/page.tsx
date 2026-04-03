"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { authService } from "@/services/auth.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Loader2, ArrowRight } from "lucide-react";

export default function AppcodePage() {
	const router = useRouter();
	const { setAppcodeData, setLoading, setError, isLoading, error, clearError } = useAuthStore();
	const [appcode, setAppcode] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!appcode.trim()) return;

		clearError();
		setLoading(true);

		try {
			const response = await authService.validateAppcode(appcode.trim());

			if (response.success && response.data) {
				setAppcodeData(response.data);
				router.push("/auth/login");
			} else {
				setError(response.message || "Invalid appcode. Please try again.");
			}
		} catch (err: unknown) {
			console.error("Appcode validation error:", err);
			const error = err as {
				response?: {
					data?: {
						message?: string;
						success?: boolean;
					};
					status?: number;
				};
				message?: string;
			};

			let errorMessage = "Failed to validate appcode. Please try again.";

			if (error.response?.data?.message) {
				errorMessage = error.response.data.message;
			} else if (error.response?.status) {
				errorMessage = `Server error (${error.response.status}). Please try again.`;
			} else if (error.message) {
				errorMessage = error.message;
			}

			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="p-8">
			<div className="text-center mb-6">
				<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-4 ring-primary/5">
					<Building2 className="h-6 w-6 text-primary" />
				</div>
				<h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
				<p className="text-sm text-muted-foreground mt-1">
					Enter your organization code to continue
				</p>
			</div>
			<form onSubmit={handleSubmit} className="space-y-5">
				<div className="space-y-2">
					<Label htmlFor="appcode" className="text-sm font-medium">
						Organization Code
					</Label>
					<Input
						id="appcode"
						type="text"
						placeholder="e.g. AWFATECH"
						value={appcode}
						onChange={(e) => setAppcode(e.target.value)}
						disabled={isLoading}
						autoFocus
						className="h-11 rounded-xl"
					/>
				</div>
				{error && (
					<div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
						<p className="text-sm text-destructive">{error}</p>
					</div>
				)}
				<Button
					type="submit"
					className="w-full h-11 rounded-xl font-medium text-sm gap-2"
					disabled={isLoading || !appcode.trim()}
				>
					{isLoading ? (
						<>
							<Loader2 className="h-4 w-4 animate-spin" />
							Validating...
						</>
					) : (
						<>
							Continue
							<ArrowRight className="h-4 w-4" />
						</>
					)}
				</Button>
			</form>
		</div>
	);
}
