import { Component, OnInit, Renderer, ViewChild } from '@angular/core';
import { Subject } from 'rxjs/Rx';
import { ImageService } from './../services/image.service';
import { ExifToolService } from './../services/exifTool.service';

@Component({
    templateUrl: 'image_Gallery.component.html',
    styleUrls: ['image_Gallery.component.css'],
    host: {
        '(document:scroll)': 'onScroll($event)',
        '(window:keypress)': 'onKey($event)'
    }
})
export class ImageGalleryComponent {
    @ViewChild('table') table;
    private _errorMessage_imageService: string;
    errorMessage_exifToolService: string;
    private _imageNameClicked: string;
    private _imageNames_edited: string[];
    public imgDir_edited: string;
    metadata = {};
    metadata_keys = [];
    private _metadata_table_height: string;
    private _actual_Image: string;
    private _editedImages_text = "images_edited.txt";
    private _contextMenuElements = [
        { title: 'transfer for editing', subject: new Subject() }
    ];
    constructor(private _imageService: ImageService, private _exifToolService: ExifToolService, private _renderer: Renderer) { }
    ngOnInit() {
        this.getImageNames();
        this.imgDir_edited = this._imageService.imageDir_edited;
        this._contextMenuElements.forEach(elements => elements.subject.subscribe(val => this.contextMenu(val)));

        var event = { pageY: document.body.scrollTop };
        this.onScroll(event);
    }
    onMouseOverImage(event) {
        if (event.event === 'mouseOver') {
            this._actual_Image = event.img_name;
            if (typeof this._imageNameClicked === 'undefined') {
                this.getMetadata(event.img_name);
            }

        }
        if (event.event === 'mouseClicked') {
            if (this._imageNameClicked !== event.img_name) {
                this.getMetadata(event.img_name);
                this._imageNameClicked = event.img_name;
                this._renderer.setElementClass(event.element, 'clicked', true);
            } else {
                this._imageNameClicked = undefined;
                this._renderer.setElementClass(event.element, 'clicked', false);
            }
        }
    }
    getMetadata(imageName: string) {
        this._exifToolService.imageName_edited = imageName;
        this.metadata = this._exifToolService.metadata_edited;
    }
    imageClicked(imgName: string) {
        if (this._imageNameClicked === imgName) {
            return true;
        }
        return false;
    }
    contextMenu(val) {
        if (val === this._contextMenuElements[0].title) {
            this._imageService.moveImageBackForEditing(this._actual_Image).subscribe(
                data => { this.getImageNames(); },
                error => this.errorMessage_exifToolService = <any>error
            );
        }
    }
    removeString(array: string[], string) {
        for (var i = 0; i < array.length; i++) {
            if (array[i].indexOf(string) > -1) {
                array.splice(i, 1);

            }
        }
        return array;
    }
    getImageNames() {
        this._imageService.getImageNames_edited().subscribe(
            images => {
                images = this.removeString(images, this._editedImages_text);
                this._imageNames_edited = images;
            },
            error => { this._errorMessage_imageService = <any>error }
        );
    }
    onScroll(event) {
        var grow_limit = Math.floor(0.25 * window.innerHeight);
        if (event.pageY <= grow_limit) {
            this._metadata_table_height = 'calc(70vh + ' + event.pageY + 'px)';
        }
    }
    onKey(event) {
        var key = event.key;
        switch (key) {
            case 's':
                this._renderer.invokeElementMethod(this.table.nativeElement, 'scrollBy', [0, 50])
                break;
            case 'w':
                this._renderer.invokeElementMethod(this.table.nativeElement, 'scrollBy', [0, -50])
        }
    }
}
