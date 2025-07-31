import { renderToPipeableStream } from "react-dom/server";
import { ServerRouter } from "react-router";
import React from "react";
import "./i18n";

// Import PassThrough from stream module
import { PassThrough } from "node:stream";

const ABORT_DELAY = 5_000;

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: any,
  loadContext: any,
) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={routerContext} url={request.url} />,
      {
        onShellReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );

          pipe(body);
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          // Log streaming rendering errors from inside the shell.  Don't log
          // errors encountered during initial shell rendering since they'll
          // reject and get logged in handleDocumentRequest.
          if (shellRendered) {
            console.error(error);
          }
        },
      },
    );

    setTimeout(abort, ABORT_DELAY);
  });
}

// Helper function to convert Node.js readable stream to Web API ReadableStream
function createReadableStreamFromReadable(source: NodeJS.ReadableStream) {
  return new ReadableStream({
    start(controller) {
      source.on("data", (chunk) => controller.enqueue(chunk));
      source.on("end", () => controller.close());
      source.on("error", (error) => controller.error(error));
    },
  });
}
