from http.server import SimpleHTTPRequestHandler, HTTPServer
import os

class SPAHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if not os.path.exists(self.path[1:]):
            self.path = '../index.html'
        return super().do_GET()

def run(server_class=HTTPServer, handler_class=SPAHandler):
    server_address = ('', 8080)
    httpd = server_class(server_address, handler_class)
    try:
        print('Starting server at http://localhost:8080...')
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\nServer is shutting down...')
    finally:
        httpd.server_close()
        print('Server stopped.')

if __name__ == '__main__':
    run()
