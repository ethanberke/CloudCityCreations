import { Box, Button, Modal, Stack, Typography } from "@mui/material";

export default function DeleteConfirmModal({
  open,
  recipeName,
  onCancel,
  onConfirm,
  deleting = false,
}) {
  return (
    <Modal open={open} onClose={deleting ? undefined : onCancel}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "90%", sm: 420 },
          bgcolor: "background.paper",
          boxShadow: 24,
          p: 3,
          borderRadius: 2,
        }}
      >
        <Typography variant="h5" component="h2" gutterBottom>
          Delete this recipe?
        </Typography>

        <Typography variant="h6" sx={{ wordBreak: "break-word" }} mt={2}>
          {recipeName}
        </Typography>

        <Typography mt={2}>
          This permanently deletes the recipe along with all of its ingredients
          and steps. This cannot be undone.
        </Typography>

        <Stack direction="row" spacing={2} justifyContent="flex-end" mt={3}>
          <Button onClick={onCancel} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </Stack>
      </Box>
    </Modal>
  );
}
