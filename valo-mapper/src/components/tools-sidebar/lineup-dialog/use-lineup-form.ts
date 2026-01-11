import { useState, useCallback, useMemo } from "react";
import { debounce } from "@/lib/utils";

export const useLineupForm = () => {
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [selectedAbility, setSelectedAbility] = useState<string>("");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [youtubeLink, setYoutubeLink] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [lineColor, setLineColor] = useState<string>("#ffffff");

  const debouncedSetLineColor = useMemo(
    () => debounce((color: string) => setLineColor(color), 16),
    []
  );

  const handleAgentChange = useCallback((agentName: string) => {
    setSelectedAgent(agentName);
    setSelectedAbility("");
  }, []);

  const handleRemoveImage = useCallback((index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const resetForm = useCallback(() => {
    setSelectedAgent("");
    setSelectedAbility("");
    setUploadedImages([]);
    setYoutubeLink("");
    setNotes("");
    setLineColor("#ffffff");
  }, []);

  const isFormValid = useCallback(() => {
    return (
      selectedAgent &&
      selectedAbility &&
      (uploadedImages.length > 0 ||
        youtubeLink.trim() !== "" ||
        notes.trim() !== "")
    );
  }, [selectedAgent, selectedAbility, uploadedImages, youtubeLink, notes]);

  return {
    selectedAgent,
    selectedAbility,
    uploadedImages,
    youtubeLink,
    notes,
    lineColor,
    setSelectedAgent,
    setSelectedAbility,
    setUploadedImages,
    setYoutubeLink,
    setNotes,
    debouncedSetLineColor,
    handleAgentChange,
    handleRemoveImage,
    resetForm,
    isFormValid,
  };
};
