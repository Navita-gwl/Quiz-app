import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { AlertCircle } from "lucide-react";
import { resolveFetcherError, GENERIC_LOAD_ERROR } from "../utils/userFacingErrors";

interface Quiz {
  id: string;
  title: string;
  quizPublicId: string;
}

interface ViewQuizModalProps {
  open: boolean;
  quiz: Quiz | null;
  onClose: () => void;
}

export function ViewQuizModal({ open, quiz, onClose }: ViewQuizModalProps) {
  const fetcher = useFetcher<any>();
  const shopify = useAppBridge();

  // Fetch quiz questions only when open
  useEffect(() => {
    if (open && quiz) {
      fetcher.load(`/app/questions?quizId=${quiz.id}&all=true`);
    }
  }, [open, quiz]);

  // Lock background scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open || !quiz) return null;

  const questions = fetcher.data?.questions || [];
  const isLoading = fetcher.state === "loading";
  const loadError =
    fetcher.state === "idle" && fetcher.data
      ? (typeof fetcher.data.loadError === "string"
          ? fetcher.data.loadError
          : resolveFetcherError(fetcher.data, GENERIC_LOAD_ERROR))
      : null;

  const handleCopy = () => {
    if (!quiz.quizPublicId) return;
    navigator.clipboard.writeText(quiz.quizPublicId);
    shopify.toast.show("Quiz ID copied to clipboard");
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "RADIO":
        return "Single Select";
      case "CHECKBOX":
        return "Multi Select";
      case "DROPDOWN":
        return "Dropdown (Single Select)";
      case "DROPDOWN_MULTI":
        return "Dropdown (Multi Select)";
      default:
        return type;
    }
  };

  const getOptionCount = (options: any) => {
    if (!Array.isArray(options)) return 0;
    return options.length;
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(32, 34, 35, 0.6)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.15)",
        width: "640px",
        maxWidth: "95%",
        height: "80vh",
        maxHeight: "85vh",
        border: "1px solid #e1e3e5",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column"
      }}>
        {/* Sticky Modal Header */}
        <div style={{
          position: "sticky",
          top: 0,
          padding: "20px 24px",
          borderBottom: "1px solid #e1e3e5",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          backgroundColor: "#f6f6f7",
          zIndex: 10,
        }}>
          <div style={{ flex: 1, minWidth: 0, paddingRight: "16px" }}>
            <h2 style={{
              fontSize: "16px",
              fontWeight: "600",
              color: "#202223",
              margin: 0,
              lineHeight: "1.4",
              overflowWrap: "anywhere",
              wordBreak: "break-word",
            }}>
              {quiz.title}
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "6px" }}>
              <span style={{ fontSize: "13px", color: "#6d7175" }}>
                Quiz ID: <code style={{ backgroundColor: "#f1f2f4", padding: "2px 6px", borderRadius: "4px", fontSize: "12px" }}>{quiz.quizPublicId}</code>
              </span>
              <button
                onClick={handleCopy}
                style={{
                  background: "#ffffff",
                  border: "1px solid #babfc3",
                  borderRadius: "6px",
                  padding: "5px",
                  cursor: "pointer",
                  color: "#5c5f62",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background-color 0.15s, border-color 0.15s, color 0.15s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f6f6f7";
                  e.currentTarget.style.borderColor = "#a8acb1";
                  e.currentTarget.style.color = "#202223";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#ffffff";
                  e.currentTarget.style.borderColor = "#babfc3";
                  e.currentTarget.style.color = "#5c5f62";
                }}
                title="Copy Quiz ID"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
            {!isLoading && (
              <span style={{ display: "inline-block", fontSize: "13px", color: "#6d7175", marginTop: "6px" }}>
                Total Questions: <strong>{questions.length}</strong>
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div style={{
          padding: "24px",
          overflowY: "auto",
          flex: 1,
          backgroundColor: "#ffffff"
        }}>
          {isLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
              <span style={{ fontSize: "14px", color: "#6d7175" }}>Loading questions...</span>
            </div>
          ) : loadError ? (
            <div style={{ textAlign: "center", padding: "40px 24px", color: "#b42318" }}>
              <p style={{ fontSize: "14px", margin: 0, fontWeight: 600 }}>{loadError}</p>
            </div>
          ) : questions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#6d7175" }}>
              <p style={{ fontSize: "14px", margin: 0 }}>No questions found in this quiz.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {questions.map((question: any, index: number) => (
                <div
                  key={question.id}
                  style={{
                    border: "1px solid #e1e3e5",
                    borderRadius: "10px",
                    padding: "20px",
                    backgroundColor: "#ffffff",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    minWidth: 0,
                  }}
                >
                  {/* Question Header & Summary */}
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid #f1f2f4",
                    paddingBottom: "10px",
                    flexWrap: "wrap",
                    gap: "10px"
                  }}>
                    <span style={{ fontSize: "15px", fontWeight: "600", color: "#202223" }}>
                      Question {index + 1}
                    </span>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{
                        fontSize: "11px",
                        backgroundColor: "#f1f2f4",
                        color: "#4f5357",
                        padding: "3px 8px",
                        borderRadius: "12px",
                        fontWeight: "500"
                      }}>
                        Type: {getTypeLabel(question.type)}
                      </span>
                      <span style={{
                        fontSize: "11px",
                        backgroundColor: "#e2f1e8",
                        color: "#1e5c37",
                        padding: "3px 8px",
                        borderRadius: "12px",
                        fontWeight: "500"
                      }}>
                        {getOptionCount(question.options)} Options
                      </span>
                    </div>
                  </div>

                  {/* Question Text */}
                  <p style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#202223",
                    margin: 0,
                    lineHeight: "1.5",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    wordBreak: "break-word"
                  }}>
                    {question.text}
                  </p>

                  {/* Answer Options */}
                  <div style={{
                    borderTop: "1px dashed #e1e3e5",
                    paddingTop: "12px",
                    marginTop: "4px"
                  }}>
                    <span style={{
                      fontSize: "11px",
                      fontWeight: "600",
                      color: "#8c9196",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      display: "block",
                      marginBottom: "8px"
                    }}>
                      Options List
                    </span>
                    {question.optionType === "image" ? (
                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        {Array.isArray(question.options) && question.options.map((opt: any, idx: number) => {
                          const label = typeof opt === "string" ? opt : opt?.label || "";
                          const imageSrc = typeof opt === "string" ? null : opt?.imageSrc || null;
                          return (
                            <div
                              key={idx}
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "6px",
                                border: "1px solid #e1e3e5",
                                borderRadius: "8px",
                                padding: "8px",
                                backgroundColor: "#fafbfb",
                                width: "90px",
                                minWidth: "90px",
                                maxWidth: "120px",
                                textAlign: "center",
                                boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
                              }}
                            >
                              {imageSrc ? (
                                <img
                                  src={imageSrc}
                                  alt={label || "option"}
                                  style={{
                                    width: "48px",
                                    height: "48px",
                                    borderRadius: "6px",
                                    objectFit: "cover",
                                    border: "1px solid #e1e3e5"
                                  }}
                                />
                              ) : (
                                <div style={{
                                  width: "48px",
                                  height: "48px",
                                  borderRadius: "6px",
                                  backgroundColor: "#f1f2f4",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "10px",
                                  color: "#6d7175",
                                  border: "1px dashed #babfc3"
                                }}>
                                  No Img
                                </div>
                              )}
                              <span style={{
                                fontSize: "11px",
                                color: "#202223",
                                fontWeight: "500",
                                width: "100%",
                                lineHeight: "1.35",
                                overflowWrap: "anywhere",
                                wordBreak: "break-word",
                              }}>
                                {label || `Option ${idx + 1}`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <ul style={{ margin: 0, paddingLeft: "18px", color: "#202223" }}>
                        {Array.isArray(question.options) && question.options.map((opt: any, idx: number) => {
                          const text = typeof opt === "string" ? opt : opt?.label || "";
                          return (
                            <li key={idx} style={{
                              fontSize: "13px",
                              marginBottom: "6px",
                              lineHeight: "1.4",
                              color: "#4f5357",
                              overflowWrap: "anywhere",
                              wordBreak: "break-word",
                              whiteSpace: "pre-wrap",
                            }}>
                              {text || `Option ${idx + 1}`}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
