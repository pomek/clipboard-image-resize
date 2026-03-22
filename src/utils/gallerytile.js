export default function createGalleryTile( { entry, template, onRemove, onSelect } ) {
	const galleryContent = template.content.cloneNode( true );
	const galleryTile = galleryContent.querySelector( '.js-gallery-tile' );
	const galleryRemove = galleryTile.querySelector( '.js-gallery-remove' );
	const galleryPreview = galleryTile.querySelector( '.js-gallery-preview' );
	const galleryPreviewMeta = galleryTile.querySelector( '.js-gallery-preview-meta' );

	galleryTile.dataset.entryId = entry.id;
	galleryPreview.style.backgroundImage = `linear-gradient(180deg, rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0.55)), url(${ entry.sourceUrl })`;
	galleryPreviewMeta.textContent = `${ entry.image.width } x ${ entry.image.height }`;

	galleryPreview.addEventListener( 'click', () => {
		onSelect( entry.id );
	} );

	galleryRemove.addEventListener( 'click', () => {
		onRemove( entry.id );
	} );

	return galleryTile;
}
