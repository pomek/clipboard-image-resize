/**
 * Source: https://github.com/ckeditor/ckeditor5/blob/master/packages/ckeditor5-utils/src/mix.js.
 *
 * @param {Function} baseClass
 * @param {Function|Object} [...mixins]
 */
export default function mix( baseClass, ...mixins ) {
	mixins.forEach( mixin => {
		Object.getOwnPropertyNames( mixin )
			.forEach( key => {
				if ( key in baseClass.prototype ) {
					return;
				}

				const sourceDescriptor = Object.getOwnPropertyDescriptor( mixin, key );
				sourceDescriptor.enumerable = false;

				Object.defineProperty( baseClass.prototype, key, sourceDescriptor );
			} );
	} );
}
