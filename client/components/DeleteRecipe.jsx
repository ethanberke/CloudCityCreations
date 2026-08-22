import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import IconButton from "@mui/material/IconButton";

export default function DeleteRecipe() {
  return (
    <IconButton
      aria-label="delete recipe"
      onClick={(e) => e.stopPropagation()}
      sx={{
        position: "absolute",
        top: -10,
        right: -10,
        zIndex: 1,
        color: "text.primary",
      }}
    >
      <HighlightOffIcon />
    </IconButton>
  );
}
