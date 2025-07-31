import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "test-utils";
import { TrajectoryActions } from "#/components/features/trajectory/trajectory-actions";

describe("TrajectoryActions", () => {
  const user = userEvent.setup();
  const onPositiveFeedback = vi.fn();
  const onNegativeFeedback = vi.fn();
  const onExportTrajectory = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should render correctly", () => {
    renderWithProviders(
      <TrajectoryActions
        onPositiveFeedback={onPositiveFeedback}
        onNegativeFeedback={onNegativeFeedback}
        onExportTrajectory={onExportTrajectory}
      />,
    );

    const actions = screen.getByTestId("feedback-actions");
    // Only export button is rendered in SAAS mode
    within(actions).getByTestId("export-trajectory");
  });

  // Feedback buttons are removed in SAAS mode - tests removed

  it("should call onExportTrajectory when export button is clicked", async () => {
    renderWithProviders(
      <TrajectoryActions
        onPositiveFeedback={onPositiveFeedback}
        onNegativeFeedback={onNegativeFeedback}
        onExportTrajectory={onExportTrajectory}
      />,
    );

    const exportButton = screen.getByTestId("export-trajectory");
    await user.click(exportButton);

    expect(onExportTrajectory).toHaveBeenCalled();
  });

  // SaaS mode tests removed - app always operates in SAAS/database mode
});
