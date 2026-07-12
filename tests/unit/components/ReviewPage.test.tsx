import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ReviewPage from "../../../src/ReviewPage";

const baseProps = {
  reviewFlashColumn: "",
  checkInReplyDrafts: {},
  checkInReplySaving: "",
  clientLabel: vi.fn((client: any) => client?.name || client?.clientId || ""),
  coachReviewCheckIns: [],
  coachReviewError: "",
  focusReviewColumn: vi.fn(),
  formVideoReplies: {},
  getOrderPipelineStatus: vi.fn(() => ({ label: "Paid", tone: "ok" })),
  globalMissedWorkouts: [],
  globalReviewOrders: [],
  globalReviewSubmissionItems: [],
  globalUnreviewedWorkoutComments: [],
  markGlobalWorkoutCommentReviewed: vi.fn(),
  newEnquiries: [],
  openOrderReview: vi.fn(),
  openReviewClient: vi.fn(),
  openReviewSections: {
    enquiries: true,
    comments: true,
    submissions: true,
    missed: true,
    checkins: true,
  },
  openReviewWorkout: vi.fn(),
  respondToCheckIn: vi.fn(),
  reviewFormVideo: vi.fn(),
  reviewFormVideos: [],
  reviewingWorkoutCommentKey: "",
  setActivePage: vi.fn(),
  setCheckInReplyDrafts: vi.fn(),
  setFormVideoReplies: vi.fn(),
  setSelectedContentSubmission: vi.fn(),
  toggleReviewSection: vi.fn(),
};

describe("ReviewPage", () => {
  it("renders the review workspace with its summary cards", () => {
    render(<ReviewPage {...baseProps} />);
    expect(
      screen.getByText(/Client comments, form & test submissions/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Workout comments")).toBeInTheDocument();
    expect(screen.getByText("In-Person Enquiries")).toBeInTheDocument();
  });

  it("shows empty states when nothing needs review, and surfaces errors", () => {
    render(<ReviewPage {...baseProps} coachReviewError="Feishu timeout" />);
    expect(screen.getByText("Feishu timeout")).toBeInTheDocument();
    expect(
      screen.getByText("No new in-person enquiries.")
    ).toBeInTheDocument();
  });
});
