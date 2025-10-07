import React from "react";
import { render, screen } from "@testing-library/react";
import App from "./App";

test("首页显示沉浸式语言平台标题", () => {
  render(<App />);
  const titleElement = screen.getByText("沉浸式语言平台");
  expect(titleElement).toBeInTheDocument();
});
