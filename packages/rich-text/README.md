# Rich Text Editor & Displayer

A full-fledged rich text editor and displayer for React apps, built using DraftJS.

## Styling

Pass in an object containing styling information to the `styles` prop in order to override the default styles.

```
<TextEditor
    initialContentState={TextEditor.hydrate({ data: course.description })}
    readOnly={true}
    styles={{text: {fontSize: 30}}}
/>
```

The following object details the default styles and what all components you can target from your custom styles.

```
{
  controls: {
    container: {
      display: "flex",
      flexDirection: "column",
      border: "1px solid #eee",
    },
    editor: {
      maxHeight: "50vh",
      overflowX: "none",
      overflowY: "scroll",
      padding: 10,
    },
    toolbar: {
      padding: 10,
      background: "#f7f7f7",
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
    },
    toolbarInput: {
      background: "rgb(179 188 255)",
      padding: 10,
    },
    toolbarButton: {
      border: "none",
      background: "transparent",
      padding: 10,
      "&:hover": {
        background: "#585858",
      },
      fontWeight: "bold",
      fontSize: 16,
    },
  },
  media: {
    container: {
      display: "flex",
      justifyContent: "center",
    },
    img: {
      maxWidth: "100%",
    },
  },
  code: {
    background: "rgb(45, 45, 45)",
    color: "#e2e7ff",
    padding: "10px 16px",
    borderRadius: 2,
    fontFamily: '"Fira Code", monospace',
  },
  blockquote: {
    fontStyle: "italic",
    fontFamily: "serif",
    marginTop: 10,
    marginBottom: 10,
    borderLeft: "5px solid rgb(179 188 255)",
    paddingLeft: 10,
    fontSize: "1.6em",
    color: "rgb(58 58 58)",
  }
}
```

## Integrations

### YouTube Videos

Paste video's URL in to the editor and it will be embedded.

### Tweets

Paste any tweet's URL in the editor and the tweet will be embedded.

## Known issues

1. While editing, making changes to a tweet's URL might show previous content. The workaround is to delete the tweet URL entirely and then paste the new URL.

## Code Blocks

The editor uses [Prism](https://prismjs.com/) for syntax highlighting. You can change the default language from `javascript` to something else using the following syntax.

```
TextEditor.hydrate({ data, prismDefaultLanguage: "rust" })
```
