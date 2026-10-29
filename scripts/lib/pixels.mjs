import sharp from 'sharp';

// GPU readback can differ by one 8-bit level even for an unchanged scene.
// Compare decoded pixels, with that rounding allowance, rather than PNG dumps.
export async function pixelsMatch(first,second){
 if(first.equals(second))return true;
 const [a,b]=await Promise.all([first,second].map(buffer=>sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true})));
 if(a.info.width!==b.info.width||a.info.height!==b.info.height)return false;
 for(let index=0;index<a.data.length;index++)if(Math.abs(a.data[index]-b.data[index])>1)return false;
 return true;
}
