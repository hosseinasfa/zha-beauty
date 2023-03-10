const controller = require('app/http/controller/controller');
const Course = require('app/models/course');
const Category = require('app/models/category');
const fs = require ('fs');
const path = require ('path');
const sharp = require('sharp');

class courseController extends controller {
    async index(req , res , next) {
        try {
            let page = req.query.page || 1;
            let courses = await Course.paginate({} , { page , sort : { createdAt : 1 } , limit : 10});
            res.render('admin/courses/index' , { title : 'دوره ها' , courses})
        } catch (err) {
            next(err);
        }
    };

    async create (req , res) {
        let categories = await Category.find({});
        res.render('admin/courses/create' , { categories })
    }

    async store(req , res , next) {
        try {
            let status = await this.validationData(req);
            if(! status) {
                if(req.file)
                    fs.unlinkSync(req.file.path);
               return this.back(req,res);
            }
    
       

            
                //create course
                let images = this.imageResize(req.file);
                let { title , body , type , price , tags , lang} = req.body;
    
                let newCourse = new Course ({
                    user : req.user._id,
                    title,
                    slug : this.slug(title),
                    body,
                    type,
                    price,
                    images,
                    thumb : images["480"],
                    tags,
                    lang
                });
    
            await newCourse.save();
    
            return res.redirect('/admin/courses');
        } catch(err) {
            next(err);
        }
    }

    async edit(req , res ,next) {
        try {
            this.isMongoId(req.params.id);

            let course = await Course.findById(req.params.id);
            if( ! course) this.error('چنین دوره ای وجود ندارد' , 404);

            //using connect-roles in 'app/helpers/gate.js' in courseController without dynamic permissions if you want
            req.courseUserId = course.user;
            if( ! req.userCan('edit-courses')) {
                this.error('شما اجازه دسترسی به این صفحه ار ندارید' , 403);
            }

            let categories = await Category.find({});
    
            return res.render('admin/courses/edit' , { course , categories });
        } catch (err) {
            next(err);
        }
    }

    async update(req , res , next) {
        try {
            let status = await this.validationData(req);
            if(! status) {
                if(req.file)
                    fs.unlinkSync(req.file.path);
               return this.back(req,res);
            }
            
            let objForUpdate = {};
    
            //set image thumb
            objForUpdate.thumb = req.body.imagesThumb;
    
            //check if image exists
            if(req.file) {
                //remove previous images
                let course = await Course.findById(req.params.id);
                Object.values(course.images).forEach(image => fs.unlinkSync(`./public${image}`)); 
                //set new thumbnail image
                objForUpdate.image = this.imageResize(req.file);
                objForUpdate.thumb = objForUpdate.image["480"]; 
                //set new images
                objForUpdate.images = this.imageResize(req.file); 
    
            }
            //end check if image exists
    
            delete req.body.images; //delete images from req.body because of error
            objForUpdate.slug = this.slug(req.body.title); // update new slug
    
            //update course
            await Course.findByIdAndUpdate(req.params.id , { $set : { ...req.body , ...objForUpdate}})
    
            // redirect back
            return res.redirect('/admin/courses');
        } catch (err) {
            next(err);
        }

    }

    async destroy(req , res , next) {
        try {
            this.isMongoId(req.params.id);

            let course = await Course.findById(req.params.id).populate('episodes').exec();
            if( ! course) this.error('چنین دوره ای وجود ندارد' , 404);
    
            //delete episodes
            course.episodes.forEach(episode => episode.remove());
            
            //delete images
            Object.values(course.images).forEach(image => fs.unlinkSync(`./public${image}`));
    
            //delete courses
            course.remove();
    
    
            return res.redirect('/admin/courses');
        } catch (err) {
            next(err);
        }

    }

    imageResize(image) {
        const imageInfo = path.parse(image.path); //to recieve ext and name seperately
        let addressImages = {};
        addressImages['original'] = this.getUrlImage(`${image.destination}/${image.filename}`);

        const resize = size => {
            let imageName = `${imageInfo.name}-${size}${imageInfo.ext}`

            addressImages[size] = this.getUrlImage(`${image.destination}/${imageName}`);

            sharp(image.path)
                .resize(size , 360)//each parameter can be null
                .toFile(`${image.destination}/${imageName}`);
        }

            [1080 , 720 , 480].map(resize);

            return addressImages;
    }

    getUrlImage(dir) {
        return dir.substring(8);
    }




}

module.exports = new courseController();