import GraphiQLOriginal from "graphiql";
import "graphiql/graphiql.css";
import { createGraphiQLFetcher } from "@graphiql/toolkit";

export const GraphiQL = ({ url }: { url: string }) => {
  const fetcher = createGraphiQLFetcher({
    url,
  });

  return (
    <GraphiQLOriginal
      fetcher={fetcher}
      editorTheme="dracula"
      defaultVariableEditorOpen
      defaultSecondaryEditorOpen
      headerEditorEnabled
      shouldPersistHeaders
    />
  );
};
