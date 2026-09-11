(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/app/verify/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>VerifyDashboard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/image.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabaseClient.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
function VerifyDashboard() {
    _s();
    const [mounted, setMounted] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [userEmail, setUserEmail] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [selectedFile, setSelectedFile] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [filePreview, setFilePreview] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [activeMediaId, setActiveMediaId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [generatedToken, setGeneratedToken] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [statusMessage, setStatusMessage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [statusType, setStatusType] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isProcessing, setIsProcessing] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [vaultEvents, setVaultEvents] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    // Fetch audit logs from the Evidence Vault
    const fetchVaultLogs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "VerifyDashboard.useCallback[fetchVaultLogs]": async ()=>{
            try {
                const res = await fetch("/api/vault");
                if (!res.ok) throw new Error("Failed to fetch vault records");
                const data = await res.json();
                setVaultEvents(data.events || []);
            } catch (err) {
                console.error("Vault retrieval error:", err);
            }
        }
    }["VerifyDashboard.useCallback[fetchVaultLogs]"], []);
    const handleSignOut = async ()=>{
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.signOut();
        } catch (err) {
            console.error("Sign-out error:", err);
        } finally{
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = "/login";
        }
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "VerifyDashboard.useEffect": ()=>{
            setMounted(true);
            const checkSession = {
                "VerifyDashboard.useEffect.checkSession": async ()=>{
                    const { data: { session } } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.getSession();
                    if (!session) {
                        window.location.href = "/login";
                    } else {
                        setUserEmail(session.user.email ?? "Authenticated Creator");
                    }
                    setLoading(false);
                }
            }["VerifyDashboard.useEffect.checkSession"];
            checkSession();
            const { data: authListener } = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.onAuthStateChange({
                "VerifyDashboard.useEffect": (event, session)=>{
                    if (event === "SIGNED_OUT" || !session) {
                        window.location.href = "/login";
                    }
                }
            }["VerifyDashboard.useEffect"]);
            return ({
                "VerifyDashboard.useEffect": ()=>{
                    authListener.subscription.unsubscribe();
                }
            })["VerifyDashboard.useEffect"];
        }
    }["VerifyDashboard.useEffect"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "VerifyDashboard.useEffect": ()=>{
            if (mounted && !loading) {
                fetchVaultLogs();
            }
        }
    }["VerifyDashboard.useEffect"], [
        mounted,
        loading,
        fetchVaultLogs
    ]);
    // Handle file selection and preview
    const handleFileChange = (e)=>{
        const file = e.target.files?.[0] || null;
        setSelectedFile(file);
        setActiveMediaId(null);
        setGeneratedToken(null);
        setStatusMessage(null);
        if (file) {
            const previewUrl = URL.createObjectURL(file);
            setFilePreview(previewUrl);
        } else {
            setFilePreview(null);
        }
    };
    // Register image as original asset (Locked Business Logic)
    const handleRegister = async ()=>{
        if (!selectedFile) return;
        setIsProcessing(true);
        setStatusMessage(null);
        const formData = new FormData();
        formData.append("file", selectedFile);
        try {
            const { data: { session } } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.getSession();
            const headers = {};
            if (session?.access_token) {
                headers["Authorization"] = `Bearer ${session.access_token}`;
            }
            const res = await fetch("/api/media/register", {
                method: "POST",
                headers,
                body: formData
            });
            const data = await res.json();
            const mediaId = data?.media?.id || data?.mediaId || data?.id;
            if (!res.ok || !mediaId) {
                throw new Error(data?.error || "Failed to register media asset.");
            }
            setActiveMediaId(mediaId);
            setStatusType("success");
            setStatusMessage(`Media asset successfully registered. Media ID: ${mediaId}`);
            fetchVaultLogs();
        } catch (err) {
            setStatusType("error");
            setStatusMessage(err instanceof Error ? err.message : "Registration failed.");
        } finally{
            setIsProcessing(false);
        }
    };
    // Check perceptual hash for derivative matches (Locked Business Logic)
    const handleVerify = async ()=>{
        if (!selectedFile) return;
        setIsProcessing(true);
        setStatusMessage(null);
        const formData = new FormData();
        formData.append("file", selectedFile);
        try {
            const res = await fetch("/api/derivatives/check", {
                method: "POST",
                body: formData
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Verification check failed.");
            if (data.matchesFound && data.matches.length > 0) {
                const topMatch = data.matches[0];
                setActiveMediaId(topMatch.mediaId);
                setStatusType("success");
                setStatusMessage(`Original asset match detected (${topMatch.confidence}% confidence). Media ID: ${topMatch.mediaId}`);
            } else {
                setStatusType("info");
                setStatusMessage(`No matching registered media found. Query pHash: ${data.queryHash || "Computed"}`);
            }
            fetchVaultLogs();
        } catch (err) {
            setStatusType("error");
            setStatusMessage(err instanceof Error ? err.message : "Verification failed.");
        } finally{
            setIsProcessing(false);
        }
    };
    // Generate authorization token (Locked Business Logic)
    const handleGenerateToken = async ()=>{
        if (!activeMediaId) {
            setStatusType("error");
            setStatusMessage("Register or verify the asset first to acquire an active Media ID.");
            return;
        }
        setIsProcessing(true);
        setStatusMessage(null);
        try {
            const res = await fetch("/api/tokens", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    mediaId: activeMediaId,
                    requesterApp: "External-AI-Agent-Demo",
                    durationMinutes: 120
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Token generation failed.");
            setGeneratedToken(data.token);
            setStatusType("success");
            setStatusMessage("Cryptographic usage authorization token issued successfully.");
            fetchVaultLogs();
        } catch (err) {
            setStatusType("error");
            setStatusMessage(err instanceof Error ? err.message : "Token creation failed.");
        } finally{
            setIsProcessing(false);
        }
    };
    // Revoke active token (Locked Business Logic)
    const handleRevokeToken = async ()=>{
        if (!generatedToken) return;
        setIsProcessing(true);
        try {
            const res = await fetch("/api/tokens", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    token: generatedToken,
                    reason: "Manually revoked by creator"
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to revoke token.");
            setStatusType("error");
            setStatusMessage("Authorization token revoked and blacklisted from network.");
            setGeneratedToken(null);
            fetchVaultLogs();
        } catch (err) {
            setStatusType("error");
            setStatusMessage(err instanceof Error ? err.message : "Revocation failed.");
        } finally{
            setIsProcessing(false);
        }
    };
    // Download cryptographic certificate (Locked Business Logic)
    const handleDownloadCertificate = async ()=>{
        if (!activeMediaId) return;
        setIsProcessing(true);
        try {
            const res = await fetch(`/api/media/${activeMediaId}/certificate`);
            if (!res.ok) throw new Error("Failed to retrieve certificate.");
            const certData = await res.json();
            const blob = new Blob([
                JSON.stringify(certData, null, 2)
            ], {
                type: "application/json"
            });
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = `PM-Certificate-${activeMediaId.slice(0, 8)}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);
            setStatusType("success");
            setStatusMessage("Cryptographic certificate exported successfully.");
        } catch (err) {
            setStatusType("error");
            setStatusMessage(err instanceof Error ? err.message : "Certificate export failed.");
        } finally{
            setIsProcessing(false);
        }
    };
    if (!mounted || loading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "min-h-screen bg-[#040507] flex items-center justify-center font-mono text-xs text-amber-500/80 tracking-widest",
            children: "LOADING FORENSIC CONTROL ROOM..."
        }, void 0, false, {
            fileName: "[project]/src/app/verify/page.tsx",
            lineNumber: 288,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen bg-[#040507] bg-cyber-grid text-slate-100 font-sans pb-16 selection:bg-amber-500/20 selection:text-amber-200",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                className: "border-b border-white/5 bg-[#070a10]/80 backdrop-blur-md sticky top-0 z-30 px-6 sm:px-12 py-4 flex items-center justify-between",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                href: "/",
                                className: "flex items-center gap-2.5",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/verify/page.tsx",
                                        lineNumber: 300,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-display font-bold tracking-widest text-sm text-white uppercase",
                                        children: [
                                            "Verify",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-amber-400",
                                                children: "Me"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/verify/page.tsx",
                                                lineNumber: 302,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/verify/page.tsx",
                                        lineNumber: 301,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/verify/page.tsx",
                                lineNumber: 299,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "hidden sm:inline-block text-[10px] bg-white/5 text-amber-400/90 px-2 py-0.5 rounded border border-amber-500/20 font-mono tracking-wider",
                                children: "COMMAND STATION"
                            }, void 0, false, {
                                fileName: "[project]/src/app/verify/page.tsx",
                                lineNumber: 305,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/verify/page.tsx",
                        lineNumber: 298,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-4 text-xs font-mono",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                href: "/verify/certificate",
                                className: "text-slate-400 hover:text-white transition hidden md:inline-block tracking-wider",
                                children: "CERTIFICATE INSPECTOR"
                            }, void 0, false, {
                                fileName: "[project]/src/app/verify/page.tsx",
                                lineNumber: 311,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-slate-500 hidden sm:inline tracking-wider",
                                children: [
                                    "OPERATOR: ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-slate-300 font-mono",
                                        children: userEmail
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/verify/page.tsx",
                                        lineNumber: 318,
                                        columnNumber: 23
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/verify/page.tsx",
                                lineNumber: 317,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: handleSignOut,
                                className: "px-3 py-1.5 rounded bg-white/5 hover:bg-red-950/50 text-slate-300 hover:text-red-400 border border-white/10 hover:border-red-800 transition font-mono text-[11px] tracking-wider",
                                children: "DISCONNECT"
                            }, void 0, false, {
                                fileName: "[project]/src/app/verify/page.tsx",
                                lineNumber: 320,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/verify/page.tsx",
                        lineNumber: 310,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/verify/page.tsx",
                lineNumber: 297,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                className: "max-w-6xl mx-auto mt-8 px-6 space-y-8",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "font-mono text-[10px] text-amber-400 tracking-widest uppercase font-semibold",
                                        children: "SECURITY ENGINE // ACTIVE WORKSPACE"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/verify/page.tsx",
                                        lineNumber: 334,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                        className: "text-2xl sm:text-3xl font-display font-bold tracking-tight text-white mt-1",
                                        children: "Media Registry & Evidence Vault"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/verify/page.tsx",
                                        lineNumber: 337,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-xs sm:text-sm text-slate-400 mt-1 font-sans leading-relaxed",
                                        children: "Register original assets, verify derivatives, issue agent authorization tokens, and inspect audit chains."
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/verify/page.tsx",
                                        lineNumber: 340,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/verify/page.tsx",
                                lineNumber: 333,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-3",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                    href: "/",
                                    className: "px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono border border-white/10 transition tracking-wider",
                                    children: "← Public Experience"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/verify/page.tsx",
                                    lineNumber: 346,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/app/verify/page.tsx",
                                lineNumber: 345,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/verify/page.tsx",
                        lineNumber: 332,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        className: "bg-[#090c12]/90 border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl backdrop-blur-md corner-bracket",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center justify-between border-b border-white/5 pb-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-2",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "font-display font-bold text-xs tracking-wider text-amber-400 uppercase",
                                            children: "ASSET INGESTION & PIPELINE"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/verify/page.tsx",
                                            lineNumber: 359,
                                            columnNumber: 15
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/verify/page.tsx",
                                        lineNumber: 358,
                                        columnNumber: 13
                                    }, this),
                                    activeMediaId && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-800 text-emerald-300 tracking-wider",
                                        children: [
                                            "ACTIVE ASSET: ",
                                            activeMediaId.slice(0, 16),
                                            "..."
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/verify/page.tsx",
                                        lineNumber: 364,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/verify/page.tsx",
                                lineNumber: 357,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "border border-dashed border-white/15 hover:border-amber-500/40 rounded-xl p-6 flex flex-col items-start gap-4 bg-black/30 transition",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "file",
                                        accept: "image/*",
                                        id: "file-upload-verify",
                                        onChange: handleFileChange,
                                        className: "hidden"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/verify/page.tsx",
                                        lineNumber: 372,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        htmlFor: "file-upload-verify",
                                        className: "px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-lg cursor-pointer border border-white/20 transition tracking-wider uppercase font-sans flex items-center gap-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: "SELECT MEDIA FILE"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/verify/page.tsx",
                                                lineNumber: 383,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: "+"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/verify/page.tsx",
                                                lineNumber: 384,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/verify/page.tsx",
                                        lineNumber: 379,
                                        columnNumber: 13
                                    }, this),
                                    selectedFile && filePreview && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center justify-between bg-black/60 p-3.5 rounded-lg border border-white/10 w-full",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center gap-4",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "relative w-12 h-12 rounded overflow-hidden flex-shrink-0 bg-black border border-white/20",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                            src: filePreview,
                                                            alt: "Preview",
                                                            fill: true,
                                                            className: "object-cover",
                                                            unoptimized: true
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/verify/page.tsx",
                                                            lineNumber: 391,
                                                            columnNumber: 21
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/verify/page.tsx",
                                                        lineNumber: 390,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-xs",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "font-medium text-slate-200 font-sans",
                                                                children: selectedFile.name
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/verify/page.tsx",
                                                                lineNumber: 400,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "text-slate-500 font-mono text-[11px]",
                                                                children: [
                                                                    (selectedFile.size / 1024).toFixed(1),
                                                                    " KB"
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/app/verify/page.tsx",
                                                                lineNumber: 401,
                                                                columnNumber: 21
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/verify/page.tsx",
                                                        lineNumber: 399,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/verify/page.tsx",
                                                lineNumber: 389,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-[10px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-2 py-1 rounded tracking-wider",
                                                children: "LOADED"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/verify/page.tsx",
                                                lineNumber: 404,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/verify/page.tsx",
                                        lineNumber: 388,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/verify/page.tsx",
                                lineNumber: 371,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex flex-wrap items-center gap-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: handleRegister,
                                        disabled: !selectedFile || isProcessing,
                                        className: "px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed font-sans tracking-wider uppercase shadow-[0_0_15px_rgba(16,185,129,0.2)]",
                                        children: "REGISTER AS ORIGINAL"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/verify/page.tsx",
                                        lineNumber: 413,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: handleVerify,
                                        disabled: !selectedFile || isProcessing,
                                        className: "px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed font-sans tracking-wider uppercase shadow-[0_0_15px_rgba(245,158,11,0.25)]",
                                        children: "VERIFY AUTHENTICITY"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/verify/page.tsx",
                                        lineNumber: 420,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: handleGenerateToken,
                                        disabled: !activeMediaId || isProcessing,
                                        className: "px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed font-sans tracking-wider uppercase",
                                        children: "MINT AUTH TOKEN"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/verify/page.tsx",
                                        lineNumber: 427,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: handleDownloadCertificate,
                                        disabled: !activeMediaId || isProcessing,
                                        className: "px-5 py-2.5 bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-medium rounded-lg border border-white/15 transition disabled:opacity-40 disabled:cursor-not-allowed font-sans tracking-wider uppercase",
                                        children: "EXPORT CERTIFICATE"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/verify/page.tsx",
                                        lineNumber: 434,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/verify/page.tsx",
                                lineNumber: 412,
                                columnNumber: 11
                            }, this),
                            statusMessage && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: `p-4 rounded-xl border text-xs leading-relaxed ${statusType === "success" ? "bg-emerald-950/30 border-emerald-800 text-emerald-300" : statusType === "error" ? "bg-red-950/30 border-red-800 text-red-300" : "bg-blue-950/30 border-blue-800 text-blue-300"}`,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "font-display font-bold text-xs tracking-wider mb-1",
                                        children: statusType === "success" ? "✓ EXECUTION SUCCESS" : statusType === "error" ? "✕ ALERT / FAILURE" : "ℹ DIAGNOSTIC INFO"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/verify/page.tsx",
                                        lineNumber: 454,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "font-mono text-xs",
                                        children: statusMessage
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/verify/page.tsx",
                                        lineNumber: 457,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/verify/page.tsx",
                                lineNumber: 445,
                                columnNumber: 13
                            }, this),
                            generatedToken && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "p-5 bg-purple-950/20 border border-purple-800/60 rounded-xl space-y-3 text-xs",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center justify-between",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center gap-2 text-purple-300 font-display font-bold uppercase tracking-wider text-xs",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "w-2 h-2 rounded-full bg-purple-400"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/verify/page.tsx",
                                                        lineNumber: 466,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: "AUTHORIZATION CREDENTIAL ISSUED"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/verify/page.tsx",
                                                        lineNumber: 467,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/verify/page.tsx",
                                                lineNumber: 465,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                type: "button",
                                                onClick: handleRevokeToken,
                                                disabled: isProcessing,
                                                className: "px-3 py-1 bg-red-800 hover:bg-red-700 text-white font-semibold rounded text-xs transition disabled:opacity-50 font-sans tracking-wider uppercase",
                                                children: isProcessing ? "Revoking..." : "REVOKE TOKEN"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/verify/page.tsx",
                                                lineNumber: 469,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/verify/page.tsx",
                                        lineNumber: 464,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "p-3 bg-black/70 rounded-lg border border-purple-900/60 text-purple-200 select-all overflow-x-auto break-all font-mono text-[11px]",
                                        children: generatedToken
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/verify/page.tsx",
                                        lineNumber: 478,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-slate-400 text-xs font-sans leading-relaxed",
                                        children: "Valid for 120 minutes. Presentable by external AI crawler agents or syndicators to verify authorization rights."
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/verify/page.tsx",
                                        lineNumber: 481,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/verify/page.tsx",
                                lineNumber: 463,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/verify/page.tsx",
                        lineNumber: 356,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        className: "bg-[#090c12]/90 border border-white/10 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xl backdrop-blur-md",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center justify-between border-b border-white/5 pb-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "font-mono text-[10px] text-amber-400 uppercase tracking-widest font-semibold",
                                                children: "IMMUTABLE AUDIT LOG"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/verify/page.tsx",
                                                lineNumber: 492,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                                className: "text-lg font-display font-bold text-white mt-0.5",
                                                children: "Evidence Vault Chain"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/verify/page.tsx",
                                                lineNumber: 495,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/verify/page.tsx",
                                        lineNumber: 491,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: fetchVaultLogs,
                                        className: "px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-amber-400 text-xs font-sans font-semibold border border-white/10 transition flex items-center gap-1.5 tracking-wider uppercase",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: "REFRESH LOGS"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/verify/page.tsx",
                                                lineNumber: 503,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: "↻"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/verify/page.tsx",
                                                lineNumber: 504,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/verify/page.tsx",
                                        lineNumber: 499,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/verify/page.tsx",
                                lineNumber: 490,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "border border-white/10 rounded-xl overflow-hidden bg-black/40",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "overflow-x-auto",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                        className: "w-full text-left text-xs font-mono",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                className: "bg-white/[0.02] border-b border-white/10 text-slate-400 uppercase text-[10px] tracking-wider font-mono",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                            className: "py-3 px-4",
                                                            children: "Event Type"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/verify/page.tsx",
                                                            lineNumber: 513,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                            className: "py-3 px-4",
                                                            children: "Media Reference"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/verify/page.tsx",
                                                            lineNumber: 514,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                            className: "py-3 px-4",
                                                            children: "Status"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/verify/page.tsx",
                                                            lineNumber: 515,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                            className: "py-3 px-4",
                                                            children: "Metadata Payload"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/verify/page.tsx",
                                                            lineNumber: 516,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                            className: "py-3 px-4",
                                                            children: "Timestamp"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/verify/page.tsx",
                                                            lineNumber: 517,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/verify/page.tsx",
                                                    lineNumber: 512,
                                                    columnNumber: 19
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/verify/page.tsx",
                                                lineNumber: 511,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                className: "divide-y divide-white/5",
                                                children: vaultEvents.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                        colSpan: 5,
                                                        className: "py-8 text-center text-slate-500 font-sans text-xs",
                                                        children: "No cryptographic evidence events recorded in the vault."
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/verify/page.tsx",
                                                        lineNumber: 523,
                                                        columnNumber: 23
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/verify/page.tsx",
                                                    lineNumber: 522,
                                                    columnNumber: 21
                                                }, this) : vaultEvents.map((event)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                        className: "hover:bg-white/[0.02] transition",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                className: "py-3.5 px-4 font-mono font-semibold text-slate-200",
                                                                children: event.event_type
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/verify/page.tsx",
                                                                lineNumber: 530,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                className: "py-3.5 px-4 text-slate-400",
                                                                children: event.media_id ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-amber-400/80 font-mono",
                                                                    children: [
                                                                        event.media_id.slice(0, 14),
                                                                        "..."
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/src/app/verify/page.tsx",
                                                                    lineNumber: 535,
                                                                    columnNumber: 29
                                                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-slate-600 font-mono",
                                                                    children: "—"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/app/verify/page.tsx",
                                                                    lineNumber: 537,
                                                                    columnNumber: 29
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/verify/page.tsx",
                                                                lineNumber: 533,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                className: "py-3.5 px-4",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: `px-2 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wider uppercase ${event.status === "APPROVED" || event.status === "REGISTERED" ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800" : event.status === "REJECTED" || event.status === "FLAGGED" ? "bg-red-950/60 text-red-400 border border-red-800" : "bg-amber-950/60 text-amber-400 border border-amber-800"}`,
                                                                    children: event.status
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/app/verify/page.tsx",
                                                                    lineNumber: 541,
                                                                    columnNumber: 27
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/verify/page.tsx",
                                                                lineNumber: 540,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                className: "py-3.5 px-4 text-slate-500 truncate max-w-xs font-mono text-[11px]",
                                                                children: JSON.stringify(event.metadata)
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/verify/page.tsx",
                                                                lineNumber: 553,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                className: "py-3.5 px-4 text-slate-400 whitespace-nowrap font-mono text-[11px]",
                                                                children: new Date(event.created_at).toLocaleTimeString()
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/verify/page.tsx",
                                                                lineNumber: 556,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, event.id, true, {
                                                        fileName: "[project]/src/app/verify/page.tsx",
                                                        lineNumber: 529,
                                                        columnNumber: 23
                                                    }, this))
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/verify/page.tsx",
                                                lineNumber: 520,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/verify/page.tsx",
                                        lineNumber: 510,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/app/verify/page.tsx",
                                    lineNumber: 509,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/app/verify/page.tsx",
                                lineNumber: 508,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/verify/page.tsx",
                        lineNumber: 489,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/verify/page.tsx",
                lineNumber: 330,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/verify/page.tsx",
        lineNumber: 295,
        columnNumber: 5
    }, this);
}
_s(VerifyDashboard, "MDvkV3C6+fQhd39iPqSVdUX5fSg=");
_c = VerifyDashboard;
var _c;
__turbopack_context__.k.register(_c, "VerifyDashboard");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/supabaseClient.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "supabase",
    ()=>supabase
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/index.mjs [app-client] (ecmascript) <locals>");
;
const supabaseUrl = ("TURBOPACK compile-time value", "https://pikxwbkufrtdautncgpx.supabase.co") || '';
const supabaseAnonKey = ("TURBOPACK compile-time value", "sb_publishable_SFMFqBce2j9pqaQNJ4KYig_P5XOqjvY") || '';
if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(supabaseUrl, supabaseAnonKey);
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_0bmljit._.js.map