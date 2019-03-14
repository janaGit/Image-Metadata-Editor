import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import * as prefix from "../utilities/image-prefixes";
import { ExifTool } from './exif-tool';
import { ReturnObject } from './return-object';

export class Server {
    private imageDir: string;
    private imageDir_edited: string;
    private imageDir_original: string;
    private imageDir_complete: string;
    public app: express.Application;
    private router;
    private exifTool: ExifTool;
    /** 
     * For the file upload when a file has been put
     *  into the drag and drop box.
     **/
    private storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, 'images_original/');
        },
        filename: (req, file, cb) => {
            cb(null, file.originalname);
        }
    });
    private upload = multer({
        storage: this.storage
    });

    public static main() {
        let server = new Server();
        server.start();
    }
    constructor() {
        this.imageDir = './images';
        this.imageDir_edited = './images_edited';
        this.imageDir_original = './images_original';
        this.imageDir_complete = './images_complete';
        this.app = express();
        this.router = express.Router();
        this.exifTool = new ExifTool();
    }
    public start() {
        this.configRoutes();
        this.configApp();
        this.app.listen(3000, () => {
            console.log("Listening on port 3000!");
        });
    }
    private configApp() {
        this.app.use("/images", express.static('images'));
        this.app.use("/images_edited", express.static('images_edited'));
        this.app.use("/images_original", express.static('images_original'));
        this.app.use("/images_complete", express.static('images_complete'));
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'dist/index.html'));

        });
        this.app.use(express.static(path.join(__dirname, 'dist')));

        this.app.use(bodyParser.urlencoded({
            extended: false
        }));
        this.app.use(bodyParser.json());
        this.app.use('/api', this.router);
    }
    private configRoutes() {
        this.router.get('/getImageNames', this.getFileNames);
        this.router.get('/getImageNames_edited', this.getFileNames_edited);
        this.router.get('/getImageNames_original', this.getFileNames_original);
        this.router.get('/getImageNames_complete', this.getFileNames_complete);

        this.router.get('/getMetadata/:imageName/:lang', this.getMetadata_edit);
        this.router.get('/getMetadata_edited/:imageName/:lang', this.getMetadata_edited);
        this.router.post('/deleteAllMetadata/:imageName', this.deleteAllMetadata);

        this.router.post('/newImage', this.upload.single('image'), this.newImage);
        this.router.delete('/deleteImage/:imageName', this.deleteImage);

        this.router.post('/copyImageForEditing/:imageName', this.copyImageToImageFolder);
        this.router.post('/moveImageBackForEditing/:imageName', this.moveImageBackToImageFolder);
        this.router.post('/moveImageToImageGallery/:imageName', this.moveImageToImageGallery);
        this.router.post('/moveImageToImagesComplete/:imageName', this.moveImageToImageComplete);
        this.router.get('*', (req, res) => {
            res.sendFile(path.join(__dirname, 'dist/index.html'));
        });
    }

    private getFileNames = (req, res) => {
        fs.readdir(this.imageDir, (err, files) => {
            console.log('REQUEST:getFileNames: ');
            console.log(files);
            let body: { data: string[] } = { data: files };
            res.send(body);
        });
    }

    private getFileNames_edited = (req, res) => {
        fs.readdir(this.imageDir_edited, (err, files) => {
            console.log('REQUEST:getFileNames_edited: ');
            console.log(files);
            let body: { data: string[] } = { data: files };
            res.send(body);
        });
    }

    private getFileNames_complete = (req, res) => {
        fs.readdir(this.imageDir_complete, (err, files) => {
            console.log('REQUEST:getFileNames_complete: ');
            console.log(files);
            let body: { data: string[] } = { data: files };
            res.send(body);
        });
    }

    private getFileNames_original = (req, res) => {
        fs.readdir(this.imageDir_original, (err, files) => {
            console.log('REQUEST:getFileNames_original: ');
            console.log(files);
            let body: { data: string[] } = { data: files };
            res.send(body);
        });
    }

    private newImage = (req, res) => {
        console.log('REQUEST:newImage: ' + req.file.filename);
        res.send(req.file.filename);
    }

    private deleteImage = (req, res) => {
        var imageName = req.params.imageName;
        fs.unlink(this.imageDir + '/' + imageName, (err) => {
            if (err) {
                console.error(err);
                res.status(400).send(err);
            }
            console.log("File " + imageName + " deleted!");
            res.status(200).send({});

        });
    }

    private getMetadata_edit = (req, res) => {
        var imageName = req.params.imageName;
        var lang = '';

        if (req.params.lang) {
            lang = req.params.lang;
        } else {
            lang = 'en';
        }
        var metadata = this.getMetadata(this.imageDir, imageName, lang);
        metadata.then((value) => {
            res.send(value);
        }, (error) => {
            console.log(error)
            res.status(404).send(error);
        });

    }

    private getMetadata_edited = (req, res) => {
        var imageName = req.params.imageName;
        var lang = '';
        if (req.params.lang) {
            lang = req.params.lang;
        } else {
            lang = 'en';
        }
        var metadata = this.getMetadata(this.imageDir_edited, imageName, lang);
        metadata.then((value) => {
            res.send(value);
        }),
            (error) => {
                res.status(404).send(error);
            };
    }

    private getMetadata = (imageDir, imageName, lang) => {
        return new Promise((resolve, reject) => {
            fs.readdir(imageDir, (err, files) => {
                if (files.indexOf(imageName) === -1) {
                    reject('File with name: ' + imageName + ' does not exist.');
                } else {
                    let data = this.exifTool.getMetadata(imageDir, imageName, lang);
                    data.then((data) => {
                        console.log(data);
                        let body = { data: data };
                        resolve(body);
                    }, (error) => {
                        reject(error);
                    });
                }
            });
        });
    }

    private copyImageToImageFolder = (req, res) => {
        let imageName = req.params.imageName;
        let result = this.copyImage(this.imageDir_original, this.imageDir, imageName);
        result.then((value: ReturnObject) => {
            res.status(value.status).send(value);
        }, (error) => {
            res.status(error.status).send(error);
        });
    }

    private moveImageBackToImageFolder = (req, res) => {
        var imageName = req.params.imageName;
        var result = this.moveImage(this.imageDir_edited, this.imageDir, imageName, imageName);
        result.then((value: ReturnObject) => {
            res.status(value.status).send(value);
        }, (error) => {
            res.status(error.status).send(error);
        });
    }

    private moveImageToImageGallery = (req, res) => {
        var imageName = req.params.imageName;
        var result = this.moveImage(this.imageDir, this.imageDir_edited, imageName, imageName);
        result.then((value: ReturnObject) => {
            res.status(value.status).send(value);
        }, (error) => {
            res.status(error.status).send(error);
        });
    }

    private moveImageToImageComplete = (req, res) => {
        var imageName = req.params.imageName;
        let imageNameWithoutPrefix = prefix.getImageNameWithoutPrefix(imageName);
        console.log("Method: moveImageToImageComplete; imageNameWithoutPrefix: " + imageNameWithoutPrefix);
        var imageName_new = req.params.imageName_new;
        var result = this.moveImage(this.imageDir_edited, this.imageDir_complete, imageName, imageNameWithoutPrefix);
        result.then((value: ReturnObject) => {
            res.status(value.status).send(value);
        }, (error) => {
            res.status(error.status).send(error);
        });
    }

    private moveImage = (imageDir_from, imageDir_to, imageName, imageName_new): Promise<ReturnObject> => {
        return new Promise((resolve, reject) => {
            fs.readdir(imageDir_from, (err, files) => {
                if (err) {
                    var object = {
                        status: 500,
                        error: err
                    };
                    console.error(object);
                    reject(object);
                }
                if (files.indexOf(imageName) === -1) {
                    let object: ReturnObject = {
                        status: 400,
                        error: err,
                        message: '400, File does not exist.'
                    };
                    console.error(object);
                    reject(object);
                }
                fs.rename(imageDir_from + '/' + imageName, imageDir_to + '/' + imageName_new, (err) => {
                    if (err) {
                        let object = {
                            status: 500,
                            error: err
                        };
                        console.error(object);
                        reject(object);
                    }
                    let object = {
                        status: 200
                    };
                    resolve(object);
                });
            });
        });
    }

    private copyImage = (imageDir_from, imageDir_to, imageName) => {
        return new Promise((resolve, reject) => {
            fs.readdir(imageDir_from, (err, files) => {
                if (err) {
                    var object = {
                        status: 500,
                        error: err
                    };
                    console.error(object);
                    reject(object);
                }
                if (files.indexOf(imageName) === -1) {
                    let object: ReturnObject = {
                        status: 400,
                        error: err,
                        message: '400, File does not exist.'
                    };
                    console.error(object);
                    reject(object);
                }
                fs.readFile(imageDir_from + '/' + imageName, (err, image) => {
                    if (err) {
                        let object: ReturnObject = {
                            status: 500,
                            error: err,
                            message: ''
                        };
                        console.error(object);
                        reject(object);
                    }
                    fs.writeFileSync(imageDir_to + '/' + 'edited_' + imageName, image);
                    let object = {
                        status: 200
                    };
                    resolve(object);
                });

            });
        });
    }

    private deleteAllMetadata = (req, res) => {
        let imageName = req.params.imageName;
        fs.readdir(this.imageDir, (err, files) => {
            if (files.indexOf(imageName) === -1) {
                res.status(404).send('File does not exist.');
            }
            let result =  this.exifTool.deleteAllMetadata(this.imageDir, imageName);
            result.then((data) => {
                let _data = { body: "" };
                _data.body = '' + data;
                console.log('deleteAllMetadata server.ts message:' + _data.body);
                res.status(200).send(_data);
            }, (error) => {
                var _error = { body: "" };
                _error.body = '' + error;
                console.error('deleteAllMetadata server.ts  error:' + _error.body);
                res.status(500).send(_error);
            });
        });

    }
}
Server.main();