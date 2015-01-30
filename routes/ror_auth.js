app.use(connectRoute(function (router) {
 
    router.post('/ror_auth', function (req, res, next) {
      sessionid = req.body.session_id;
      token = req.body.user_token;
      params = req.body.api_read_key + "client_version2.3" + "uid" + sessionid + req.body.api_read_key
      sign_value = crypto.createHash('md5').update(params).digest('hex');

      var querystring = "sign=" + sign_value + '&client_version=2.3&channel=html5&uid=' + sessionid + '&token=' + token;


      var options = {
        uri: 'http://123.57.77.86:8080/api/customer/Detail?' + querystring,
        method: 'POST',
        multipart: [
          {
            'content-type': 'application/json',
            body: JSON.stringify({})
          }
        ]
      }
      request(options, function(error, response, body){
        JSON.parse(response.body).isSuccessful;
      });
      Step(
        function(){
          request(options, this);
        },
        function(err, response){
          isSuccessful = JSON.parse(response.body).isSuccessful.toString();
          res.end(isSuccessful);
        }
      );

    });
}));