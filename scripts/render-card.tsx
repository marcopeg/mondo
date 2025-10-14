import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Card } from "@/components/ui/Card";

const markup = renderToStaticMarkup(
  <Card title="Quick Tasks" icon="list-checks" spacing={3} collapsible collapsed>
    <div>Hello world</div>
  </Card>
);

console.log(markup);

