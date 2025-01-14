import { Spinner, Center } from "@chakra-ui/react";
import { useRouter } from "next/router";
import React, { useEffect } from "react";
import { Meta } from "../../components/meta";
import { ServiceWorkerManagerModal } from "../../components/service-worker-manager";
import { AuthManager } from "../../components/auth-manager";
import { Layout } from "../../components/layout";
import { WelcomeManager } from "../../components/welcome-manager";
import { CookieBanner } from "../../components/cookie-banner";

const LocalDatasetsIndexPage = () => {
  const router = useRouter();

  useEffect(() => {
    if (router.isReady) {
      router.replace({
        pathname: `/${router.query.workspaceSlug}/datasets`,
        query: router.query,
      });
    }
  }, [router.isReady]);

  return (
    <>
      <ServiceWorkerManagerModal />
      <WelcomeManager />
      <AuthManager />
      <Meta title="LabelFlow | Local Workspace" />
      <CookieBanner />
      <Layout>
        <Center h="full">
          <Spinner size="xl" />
        </Center>
      </Layout>
    </>
  );
};

export default LocalDatasetsIndexPage;
