This JavaScript library provides APIs to parse all of the proprietary formats used by the DSi portion of [Flipnote Hatena](http://flipnote.hatena.com/) (or "Ugomemo Theatre" in Japan).

Supported formats:

* [`ntft`](https://github.com/Flipnote-Collective/flipnote-studio-docs/wiki/.ntft-image-format) images
* [`nbf`](https://github.com/Flipnote-Collective/flipnote-studio-docs/wiki/.nbf-image-format) images 
* [`npf`](https://github.com/Flipnote-Collective/flipnote-studio-docs/wiki/.npf-image-format) images
* [`tmb`](https://github.com/pbsds/hatena-server/wiki/TMB-format) thumbnail images (and ppm too)
* [`ugo`](https://github.com/Flipnote-Collective/flipnote-studio-docs/wiki/.ugo-menu-format) menu format

### Why?

A few people were interested in rendering Flipnote Hatena pages in modern web browsers, so hopefully this will help! Besides, I already made a [Flipnote player](https://github.com/jaames/flipnote.js) in JavaScript, so why not have a complete set? \ o /

### Notes

These parsers are implemented from reverse-engineered specs. I'm pretty certain we've discovered any possible quirks at this point, but if you spot any some behaviour, please raise an issue and be sure to include the file you were having trouble with. Thanks!

### Usage


**For Images:**

There's a class available for each image type, they all work the same way:

```js
ugoFormats.NtftImage
ugoFormats.NpfImage
ugoFormats.NbfImage
ugoFormats.TmbImage
```

To create a new class instance, pass it data as an [ArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer):

```js
var ntft = new ugoFormats.NtftImage( buffer );
```

You can also load an image using the class' fetch utility, which retruns a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) object. When it loads, the promise is resolved and the image is passed as a class instance:

```js
ugoFormats.NtftImage.fetch("./example.ntft").then(ntft => {
	// do something with the ntft instance...
});
```

Each image class provides methods to convert the image into a bitmap:

* `getImage( width, height )` - returns the bitmap as an [Image](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/Image) object
* `getImageUrl( width, height )` - returns the bitmap as a [Data URL](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs)
* `getImageBlob( width, height )` - returns the bitmap as a [File Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob)

These image formats don't contain any width of height values themselves, so you have to provide those in order to display them. The only exception is TMB images, as they're always 64 x 48.

Now to put it together:

```js
// fetch example.ntft from a url:
ugoFormats.NtftImage.fetch("./example.ntft").then(ntft => {
  // when the image has loaded, convert to a bitmap
  // getImage() returns a HTML image element:
  var img = ntft.getImage(218, 32);
  // now we can just insert the image into the page:
  document.body.appendChild(img);
});
```


**For Ugomenus:**

The `UgoMenu` class can be used to parse an ugomenu from an [ArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer):

```js
var ugomenu = new ugoFormats.UgoMenu( buffer );
```

And like the image classes, there's also a `fetch` utility which retruns a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) when it loads:

```js
ugoFormats.UgoMenu.fetch("./example.ugo").then(ugomenu => {
	// do something with the ugomenu instance...
});
```

To understand ugomenus, it's highly recommended that you look at their [documentation](https://github.com/Flipnote-Collective/flipnote-studio-docs/wiki/.ugo-menu-format).

UgoMenu instances have a couple of properties:

* `contents` - array of menu items
* `layoutType` - menu layout
* `embeds` - array of embeded images (if there are any), will be either TmbImage or NtftImage instances depending on the menu layout type

Example usage:

```js
// fetch example.ugo from a url:
ugoFormats.UgoMenu.fetch("./example.ugo").then(ugomenu => {
	// when the ugomenu has loaded, get the list of embeds
    ugomenu.embeds.forEach(embed => {
		// get the embed as a HTML image element, 
        // you dont have to provide the size for embeds:
        var img = embed.getImage();
        // insert the image into the page:
        document.body.appendChild(img);
	});
});
```

### Acknowledgments

* [PBSDS](https://github.com/pbsds) for creating [Hatena Tools](https://github.com/pbsds/Hatenatools), and for giving me some notes regarding areas where the documentation fell short. 
* [JSA](https://github.com/thejsa) for performing packet captures of [Flipnote Hatena](http://flipnote.hatena.com/thankyou) before it shut down, without them reverse-engineering the app in general would have been a *huge* pain.
* [Nintendo](https://www.nintendo.com/) for creating the Flipnote Studio application.
* [Hatena](http://www.hatena.ne.jp/) for creating Flipnote Hatena, the now-defunct online service for sharing Flipnote Studio creations.
