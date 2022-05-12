import { Box, Button, ButtonGroup, ClickAwayListener, Grid, Grow, IconButton, makeStyles, Menu, MenuItem, MenuList, Paper, Popper } from '@material-ui/core'
import React, { useRef } from 'react'
import AddIcon from '@material-ui/icons/Add';
import MoreHorizIcon from '@material-ui/icons/MoreHoriz';

const useStyles = makeStyles((theme) => ({
  topBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paper: {
    padding: theme.spacing(2),
    textAlign: 'center',
    color: theme.palette.text.secondary,
  },
  input: {
    display: 'none',
  }
}));

const Sidebar = () => {
  const classes = useStyles();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const anchorRef = useRef<any>(null);

  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const openFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const importFromServer = () => {

  }

  return (
    <Box boxShadow={3}>
      <Box bgcolor="primary.main" p={2} className={classes.topBox}>
        <span>Protos</span>

        <input accept=".proto" className={classes.input} ref={fileInputRef} type="file" />

        <ButtonGroup
          ref={anchorRef}
          size="small"
          variant="contained"
          color="primary"
          aria-label="outlined primary button group"
        >
          <IconButton color="inherit" onClick={openFileUpload}>
            <AddIcon />
          </IconButton>
          <IconButton
            color="inherit"
            aria-controls="files-menu"
            aria-haspopup="true"
            onClick={handleClick}
          >
            <MoreHorizIcon />
          </IconButton>
        </ButtonGroup>
        <Popper open={open} anchorEl={anchorRef.current} role={undefined} transition disablePortal>
          {({ TransitionProps, placement }) => (
            <Grow
              {...TransitionProps}
              style={{
                transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom',
              }}
            >
              <Paper>
                <ClickAwayListener onClickAway={handleClose}>
                  <MenuList id="split-button-menu">
                    <MenuItem onClick={openFileUpload}>Import from file</MenuItem>
                    <MenuItem onClick={importFromServer}>Import from server reflection</MenuItem>
                  </MenuList>
                </ClickAwayListener>
              </Paper>
            </Grow>
          )}
        </Popper>
      </Box>
    </Box>
  )
}

export default Sidebar