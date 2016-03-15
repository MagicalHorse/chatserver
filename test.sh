Usage: websocket-bench [options] <server>

Options:

  -h, --help               Output usage information
  -V, --version            Output the version number
  -a, --amount <n>         Total number of persistent connection, Default to 100
  -c, --concurency <n>     Concurent connection per second, Default to 20
  -w, --worker <n>         Number of worker(s)
  -g, --generator <file>   Js file for generate message or special event
  -m, --message <n>        Number of message for a client. Default to 0
  -o, --output <output>    Output file
  -t, --type <type>        Type of websocket server to bench(socket.io, engine.io, faye, primus, wamp). Default to socket.io
  -p, --transport <type>   Type of transport to websocket(engine.io, websockets, browserchannel, sockjs, socket.io). Default to websockets (Just for Primus)
  -k, --keep-alive         Keep alive connection
  -v, --verbose            Verbose Logging


websocket-bench -a 1 -c 1 -g generator.js -m 100 http://182.92.7.70:8000/chat?userid=4899&timestamp=1457953389&appid=maishouh5&sign=e63491450c2ed948fba1ffaa4977df27


websocket-bench -a 100 -c 20 -g generator.js -m 100 -w 20 http://182.92.7.70:8000/chat\?userid\=4899\&timestamp\=1457953389\&appid\=maishouh5\&sign\=e63491450c2ed948fba1ffaa4977df27