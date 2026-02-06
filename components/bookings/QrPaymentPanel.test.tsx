import { render, screen } from "@testing-library/react";
import QrPaymentPanel from "./QrPaymentPanel";

describe("QrPaymentPanel", () => {
  it("renders QR image and amount", () => {
    render(
      <QrPaymentPanel
        qrImage="data:image/png;base64,abc123"
        amountLabel="₱300.00"
        status="pending"
        onClose={() => {}}
      />,
    );

    expect(screen.getByAltText("QR payment code")).toBeInTheDocument();
    expect(screen.getByText("₱300.00")).toBeInTheDocument();
  });

  it("shows success message when paid", () => {
    render(
      <QrPaymentPanel
        qrImage="data:image/png;base64,abc123"
        amountLabel="₱300.00"
        status="paid"
        onClose={() => {}}
      />,
    );

    expect(
      screen.getByText(/Payment received/i),
    ).toBeInTheDocument();
  });
});
