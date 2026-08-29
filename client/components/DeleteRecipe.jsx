import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import IconButton from "@mui/material/IconButton";

export default function DeleteRecipe({ recipeName, onDelete }) {
  return (
    <IconButton
      aria-label={recipeName ? `delete recipe ${recipeName}` : "delete recipe"}
      onClick={(e) => {
        e.stopPropagation();
        onDelete();
      }}
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
