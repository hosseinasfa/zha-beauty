const controller = require('app/http/controller/controller');
const passport = require('passport');



class loginController extends controller {
    showLoginForm(req , res) {
        const title = 'صفحه ورود';
        res.render('home/auth/login' , { messages : req.flash('errors') , title });
    }

  loginProccess(req , res , next) {
        this.validationData(req)
        .then(result =>{
            if(result) this.login(req , res , next);
            else res.redirect('/auth/login')

        });
  };

  login(req , res , next) {
    passport.authenticate('local.login' , (err , user) => {
        if(!user) return res.redirect('/auth/login');

        req.login(user , err =>{
            if(req.body.remember) {
                //set Token
                user.setRememberToken(res);
            }

            return res.redirect('/');
        })
    })(req , res , next);
  }

}

module.exports = new loginController();