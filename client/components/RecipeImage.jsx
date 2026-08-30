import CardMedia from "@mui/material/CardMedia";
import { FALLBACK_IMAGE, resolveImageUrl } from "../utils/image";

// Detail views show the whole photo. `contain` rather than `cover` because
// contributors shoot portrait as often as landscape, and cropping a tall photo
// into a short box cuts the middle out of it.
//
// The frame lives on the image itself rather than on a wrapping Paper. A Paper
// is a block element, so it stretched the full width of the modal and left a
// slab of empty background either side of a narrow portrait photo. Styling the
// image directly means the frame is the image's own box — it can't be wider
// than the picture at any aspect ratio.
export default function RecipeImage({ imageUrl, alt, maxHeight = "60vh" }) {
  return (
    <CardMedia
      component="img"
      image={resolveImageUrl(imageUrl)}
      alt={alt}
      sx={{
        display: "block",
        // Replaced elements resolve `width: auto` to their own size rather than
        // filling the parent, so auto margins actually centre them.
        mx: "auto",
        my: 2,
        width: "auto",
        maxWidth: "100%",
        maxHeight,
        objectFit: "contain",
        p: 1.5,
        bgcolor: "background.paper",
        borderRadius: 2.5,
        boxShadow: 8,
      }}
      onError={(e) => {
        e.target.onerror = null;
        e.target.src = FALLBACK_IMAGE;
      }}
    />
  );
}
