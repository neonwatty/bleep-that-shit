import React from "react";
import TranscriptionInterface from "../components/TranscriptionInterface";

const TranscriptionTest = () => {
  return (
    <div className="test-page">
      <TranscriptionInterface />

      <style jsx>{`
        .test-page {
          min-height: 100vh;
          padding: 20px;
          background-color: #f0f2f5;
        }
      `}</style>
    </div>
  );
};

export default TranscriptionTest;
