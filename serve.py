#!/usr/bin/env python3
"""Tiny development server with caching disabled.

Usage:
    python serve.py
    PORT=8080 python serve.py

The game uses ES modules, so it must be served over HTTP rather than opened
directly from the filesystem.
"""

import functools
import http.server
import os
import socketserver


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def main():
    port = int(os.environ.get("PORT", "8000"))
    directory = os.path.dirname(os.path.abspath(__file__))
    handler = functools.partial(NoCacheHandler, directory=directory)
    with Server(("127.0.0.1", port), handler) as server:
        print(f"Serving http://127.0.0.1:{port}/ (Ctrl+C to stop)")
        server.serve_forever()


if __name__ == "__main__":
    main()
