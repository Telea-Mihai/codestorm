"use client";

import GlowButton from "@/src/components/common/glow-button";
import Header from "@/src/components/common/header";
import SearchBar from "@/src/components/common/search-bar";
import Modal from "@/src/components/modals/modal";
import UploadModalLayout from "@/src/components/modals/layout";

import { CreditCard, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Page() {
  const [selectedFilter, setSelectedFilter] = useState("all");

  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const handleUploadFile = () => {
 
    setIsUploadOpen(true);
  };

  return (
    <div className="flex w-full flex-col gap-6 rounded-xl">
      <Header
        title="Dashboard"
        buttonText="Upload"
        buttonIcon={<Plus size={20} />}
        buttonOnClick={handleUploadFile}
        summary={
          <div className="text-muted-foreground flex gap-1 overflow-hidden text-base font-semibold text-ellipsis whitespace-nowrap">
            Overview dashboard ready for{" "}
            <span className="text-foreground flex items-center gap-1">
              <CreditCard size={20} />
              new modules
            </span>
          </div>
        }
      />

      <div className="flex items-center gap-4">
        <SearchBar />

        <div className="flex items-center gap-2">
          <GlowButton
            className="rounded-full px-4"
            variant={selectedFilter === "all" ? "default" : "muted"}
            onClick={() => setSelectedFilter("all")}
          >
            All
          </GlowButton>

          <GlowButton
            className="rounded-full px-4"
            variant={selectedFilter === "active" ? "default" : "muted"}
            onClick={() => setSelectedFilter("active")}
          >
            Active
          </GlowButton>

          <GlowButton
            className="rounded-full px-4"
            variant={selectedFilter === "archived" ? "default" : "muted"}
            onClick={() => setSelectedFilter("archived")}
          >
            Archived
          </GlowButton>
        </div>
      </div>

      <Modal isOpen={isUploadOpen}>
        <UploadModalLayout setModalOpen={setIsUploadOpen} />
      </Modal>
    </div>
  );
}
