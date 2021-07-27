import { PropsWithChildren } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { ApolloProvider, gql } from "@apollo/client";
import { ClassesList } from "../class-list";
import { client } from "../../../connectors/apollo-client-schema";
import { theme } from "../../../theme";
import { setupTestsWithLocalDatabase } from "../../../utils/setup-local-db-tests";

setupTestsWithLocalDatabase();

const createProject = async (name: string, projectId?: string | null) => {
  return client.mutate({
    mutation: gql`
      mutation createProject($projectId: String, $name: String!) {
        createProject(data: { id: $projectId, name: $name }) {
          id
          name
        }
      }
    `,
    variables: {
      name,
      projectId,
    },
    fetchPolicy: "no-cache",
  });
};

const createLabelClassInProject = async ({
  projectId,
  name,
  color,
}: {
  projectId: string;
  name: string;
  color: string;
}) => {
  await client.mutate({
    mutation: gql`
      mutation createLabelClass($data: LabelClassCreateInput) {
        createLabelClass(data: $data) {
          id
        }
      }
    `,
    variables: {
      data: {
        name,
        color,
        projectId,
      },
    },
  });
};

const wrapper = ({ children }: PropsWithChildren<{}>) => (
  <ApolloProvider client={client}>
    <ChakraProvider theme={theme} resetCSS>
      {children}
    </ChakraProvider>
  </ApolloProvider>
);

describe("Project class list tests", () => {
  it("Renders if the project has no classes", async () => {
    const projectId = "myProjectId";
    await createProject("myProject", projectId);
    render(<ClassesList projectId={projectId} />, { wrapper });
    expect(screen.getByText("0 Classes")).toBeDefined();
  });

  it.only("Renders the project classes", async () => {
    const projectId = "myProjectId";
    await createProject("myProject", projectId);
    await createLabelClassInProject({
      projectId,
      name: "MyFirstClass",
      color: "blue",
    });
    await createLabelClassInProject({
      projectId,
      name: "MySecondClass",
      color: "white",
    });
    await createLabelClassInProject({
      projectId,
      name: "MyThirdClass",
      color: "red",
    });
    render(<ClassesList projectId={projectId} />, { wrapper });
    await waitFor(() => expect(screen.getByText("3 Classes")).toBeDefined());
    await waitFor(() => expect(screen.getByText("MyFirstClass")).toBeDefined());
    await waitFor(() =>
      expect(screen.getByText("MySecondClass")).toBeDefined()
    );
    await waitFor(() => expect(screen.getByText("MyThirdClass")).toBeDefined());
  });
});
