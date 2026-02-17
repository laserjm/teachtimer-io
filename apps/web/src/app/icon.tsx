import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1a5eff 0%, #0037c6 100%)",
          color: "white",
          fontSize: 192,
          fontWeight: 700,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        T
      </div>
    ),
    {
      ...size,
    },
  );
}
