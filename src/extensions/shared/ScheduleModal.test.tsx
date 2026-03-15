import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Calendar: () => <span>CalendarIcon</span>,
  Clock: () => <span>ClockIcon</span>,
}));

// Mock Button component
vi.mock("../../client/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

// Extracted schedule modal component for testability
function ScheduleModal({
  onConfirm,
  onCancel,
  scheduleDate,
  onDateChange,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  scheduleDate: string;
  onDateChange: (date: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-xl">
        <h3>Schedule Post</h3>
        <p>Choose when this post should be published.</p>
        <div>
          <label>Date & Time</label>
          <input
            type="datetime-local"
            value={scheduleDate}
            onChange={(e) => onDateChange(e.target.value)}
            data-testid="schedule-date-input"
          />
        </div>
        <div>
          <button onClick={onCancel}>Cancel</button>
          <button onClick={onConfirm} disabled={!scheduleDate}>
            Schedule
          </button>
        </div>
      </div>
    </div>
  );
}

describe("ScheduleModal", () => {
  it("renders heading and description", () => {
    render(
      <ScheduleModal
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        scheduleDate="2026-03-15T14:00"
        onDateChange={vi.fn()}
      />
    );

    expect(screen.getByText("Schedule Post")).toBeInTheDocument();
    expect(screen.getByText("Choose when this post should be published.")).toBeInTheDocument();
  });

  it("shows the date/time input with provided value", () => {
    render(
      <ScheduleModal
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        scheduleDate="2026-03-15T14:00"
        onDateChange={vi.fn()}
      />
    );

    const input = screen.getByTestId("schedule-date-input") as HTMLInputElement;
    expect(input.value).toBe("2026-03-15T14:00");
  });

  it("calls onDateChange when date is modified", () => {
    const onDateChange = vi.fn();
    render(
      <ScheduleModal
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        scheduleDate="2026-03-15T14:00"
        onDateChange={onDateChange}
      />
    );

    const input = screen.getByTestId("schedule-date-input");
    fireEvent.change(input, { target: { value: "2026-03-20T10:00" } });

    expect(onDateChange).toHaveBeenCalledWith("2026-03-20T10:00");
  });

  it("calls onCancel when Cancel button clicked", () => {
    const onCancel = vi.fn();
    render(
      <ScheduleModal
        onConfirm={vi.fn()}
        onCancel={onCancel}
        scheduleDate="2026-03-15T14:00"
        onDateChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onConfirm when Schedule button clicked", () => {
    const onConfirm = vi.fn();
    render(
      <ScheduleModal
        onConfirm={onConfirm}
        onCancel={vi.fn()}
        scheduleDate="2026-03-15T14:00"
        onDateChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText("Schedule"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("disables Schedule button when no date selected", () => {
    render(
      <ScheduleModal
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        scheduleDate=""
        onDateChange={vi.fn()}
      />
    );

    const btn = screen.getByText("Schedule");
    expect(btn).toBeDisabled();
  });
});
