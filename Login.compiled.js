import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  onSnapshot
} from "firebase/firestore";
import { createInitialAccountState, createTestAccountState } from "./src/data/mockData";
import Icon from "./components/Icon";
const LeftPanel = () => /* @__PURE__ */ jsxs("div", { className: "hidden md:flex flex-col items-center justify-center w-2/5 bg-primary-600 text-white p-12", children: [
  /* @__PURE__ */ jsx("div", { className: "w-24 h-24 mb-6 text-white", children: /* @__PURE__ */ jsx(Icon, { name: "logo", className: "w-full h-full" }) }),
  /* @__PURE__ */ jsx("h1", { className: "text-3xl font-bold text-center", children: "Retail & Restaurant Hub" }),
  /* @__PURE__ */ jsx("p", { className: "mt-4 text-center text-primary-200", children: "The all-in-one solution to manage your business with ease." })
] });
const RightPanel = ({ children }) => /* @__PURE__ */ jsx("div", { className: "w-full md:w-3/5 flex items-center justify-center p-6 sm:p-12", children: /* @__PURE__ */ jsx("div", { className: "w-full max-w-sm", children }) });
const shopTypesData = [
  { type: "Retail", title: "Retail Store", description: "General stores, boutiques. Manage products, sales, and customers.", icon: "\u{1F6CD}\uFE0F" },
  { type: "Restaurant", title: "Restaurant / Cafe", description: "Manage tables, kitchen orders (KDS), and dishes.", icon: "\u{1F354}" },
  { type: "Rashan", title: "Rashan / Grocery", description: "Kirana stores, supermarkets. Sell items by weight.", icon: "\u{1F6D2}" }
];
var OperationType = /* @__PURE__ */ ((OperationType2) => {
  OperationType2["CREATE"] = "create";
  OperationType2["UPDATE"] = "update";
  OperationType2["DELETE"] = "delete";
  OperationType2["LIST"] = "list";
  OperationType2["GET"] = "get";
  OperationType2["WRITE"] = "write";
  return OperationType2;
})(OperationType || {});
const handleFirestoreError = (error, operationType, path) => {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map((provider) => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};
const Login = ({ onLogin, onDeleteBusiness }) => {
  const [step, setStep] = useState("auth");
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [shopName, setShopName] = useState("");
  const [shopTypes, setShopTypes] = useState(["Retail"]);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [userBusinesses, setUserBusinesses] = useState([]);
  const [deletingBusinessId, setDeletingBusinessId] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    if (loggedInUser) {
      const accountId = loggedInUser.accountId;
      const businessesRef = collection(db, "accounts", accountId, "businesses");
      const unsubscribe = onSnapshot(businessesRef, (snapshot) => {
        const businesses = snapshot.docs.map((doc2) => ({
          id: doc2.id,
          name: doc2.data().name
        }));
        setUserBusinesses(businesses);
        if (businesses.length > 0) {
          setStep("select_business");
        } else {
          setStep("create_business");
        }
      });
      return () => unsubscribe();
    }
  }, [loggedInUser]);
  const resetForm = () => {
    setEmail("");
    setPassword("");
    setName("");
    setError("");
    setShopName("");
    setShopTypes(["Retail"]);
  };
  const handleShopTypeToggle = (type) => {
    setShopTypes((prev) => {
      const isSelected = prev.includes(type);
      if (isSelected) {
        return prev.length === 1 ? prev : prev.filter((t) => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };
  const handleGoogleSignIn = async () => {
    setError("");
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      const userDocSnap = await getDoc(doc(db, "users", user.uid));
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const accountId = userData.accountId;
        if (accountId === user.uid) {
          const accountDocSnap = await getDoc(doc(db, "accounts", accountId));
          if (!accountDocSnap.exists()) {
            await setDoc(doc(db, "accounts", accountId), {
              id: accountId,
              name: `${userData.name || user.displayName || "User"}'s Account`,
              ownerId: user.uid,
              createdAt: (/* @__PURE__ */ new Date()).toISOString()
            });
          }
        }
        setLoggedInUser({
          id: user.uid,
          name: userData.name || user.displayName || "User",
          email: user.email || "",
          role: "Admin",
          accountId,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      } else {
        const accountId = `acc_${Date.now()}`;
        const name2 = user.displayName || "User";
        const email2 = user.email || "";
        await setDoc(doc(db, "accounts", accountId), {
          id: accountId,
          name: `${name2}'s Account`,
          ownerId: user.uid,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        const userDoc = {
          id: user.uid,
          name: name2,
          email: email2,
          role: "User",
          accountId
        };
        await setDoc(doc(db, "users", user.uid), userDoc);
        setLoggedInUser({
          ...userDoc,
          role: "Admin",
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        setUserBusinesses([]);
        setStep("create_business");
      }
    } catch (err) {
      setError(err.message || "Google sign-in failed.");
    } finally {
      setIsLoading(false);
    }
  };
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      let userCredential;
      if (isRegistering) {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        const accountId = `acc_${Date.now()}`;
        await setDoc(doc(db, "accounts", accountId), {
          id: accountId,
          name: `${name}'s Account`,
          ownerId: userCredential.user.uid,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        const userDoc = {
          id: userCredential.user.uid,
          name,
          email,
          role: "User",
          accountId
        };
        await setDoc(doc(db, "users", userCredential.user.uid), userDoc);
        setLoggedInUser({
          ...userDoc,
          role: "Admin",
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        setUserBusinesses([]);
        setStep("create_business");
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userDocSnap = await getDoc(doc(db, "users", userCredential.user.uid));
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setLoggedInUser({
            id: userCredential.user.uid,
            name: userData.name,
            email: userData.email,
            role: "Admin",
            accountId: userData.accountId,
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            updatedAt: (/* @__PURE__ */ new Date()).toISOString()
          });
        } else {
          setError("User profile not found.");
        }
      }
    } catch (err) {
      setError(err.message || "Authentication failed.");
    } finally {
      setIsLoading(false);
    }
  };
  const handleSelectBusiness = async (businessId) => {
    if (deletingBusinessId || !loggedInUser) return;
    setIsLoading(true);
    setError("");
    try {
      const businessSnap = await getDoc(doc(db, "accounts", loggedInUser.accountId, "businesses", businessId));
      if (businessSnap.exists()) {
        const businessData = businessSnap.data();
        onLogin(businessData.data, loggedInUser, userBusinesses);
      } else {
        setError("Could not load the selected business.");
      }
    } catch {
      setError("Failed to fetch business data.");
    } finally {
      setIsLoading(false);
    }
  };
  const handleDemoLogin = () => {
    setIsLoading(true);
    setError("");
    setTimeout(() => {
      const testAccount = createTestAccountState();
      const demoUser = testAccount.users.find((u) => u.role === "Admin");
      const demoBusinessInfo = {
        id: testAccount.id,
        name: testAccount.name
      };
      onLogin(testAccount, demoUser, [demoBusinessInfo]);
    }, 500);
  };
  const handleCreateBusinessSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    if (!loggedInUser) {
      setError("User session logged out. Please log in again.");
      setStep("auth");
      setIsLoading(false);
      return;
    }
    try {
      const businessId = `biz_${Date.now()}`;
      const initialState = createInitialAccountState(businessId, shopName, shopTypes);
      initialState.users.push({
        id: loggedInUser.id,
        name: loggedInUser.name,
        email: loggedInUser.email,
        role: "Admin",
        accountId: loggedInUser.accountId,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      const businessDoc = {
        id: businessId,
        name: shopName,
        accountId: loggedInUser.accountId,
        data: initialState,
        lastSyncId: 0
      };
      await setDoc(doc(db, "accounts", loggedInUser.accountId, "businesses", businessId), businessDoc);
      onLogin(initialState, loggedInUser, [...userBusinesses, { id: businessId, name: shopName }]);
    } catch (err) {
      setError(err.message || "Failed to create business.");
    } finally {
      setIsLoading(false);
    }
  };
  const renderContent = () => {
    switch (step) {
      case "auth":
        return /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("div", { className: "text-center mb-6", children: [
            /* @__PURE__ */ jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: isRegistering ? "Create Your Account" : "Sign In" }),
            /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-gray-600 dark:text-gray-400", children: isRegistering ? "One account for all your businesses." : "Enter your credentials to continue." })
          ] }),
          /* @__PURE__ */ jsxs("form", { className: "space-y-4", onSubmit: handleAuthSubmit, children: [
            isRegistering && /* @__PURE__ */ jsx("input", { value: name, onChange: (e) => setName(e.target.value), placeholder: "Your Full Name", required: true, className: "w-full px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white" }),
            /* @__PURE__ */ jsx("input", { type: "email", value: email, onChange: (e) => setEmail(e.target.value), placeholder: "Email", required: true, className: "w-full px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white" }),
            /* @__PURE__ */ jsx("input", { type: "password", value: password, onChange: (e) => setPassword(e.target.value), placeholder: "Password", required: true, className: "w-full px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white" }),
            error && /* @__PURE__ */ jsx("p", { className: "text-sm text-center text-red-500", children: error }),
            /* @__PURE__ */ jsx("button", { type: "submit", disabled: isLoading, className: "w-full flex justify-center py-2 px-4 text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50", children: isLoading ? "Please wait..." : isRegistering ? "Register" : "Sign In" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "relative my-6", children: [
            /* @__PURE__ */ jsx("div", { className: "absolute inset-0 flex items-center", children: /* @__PURE__ */ jsx("div", { className: "w-full border-t border-gray-300 dark:border-gray-700" }) }),
            /* @__PURE__ */ jsx("div", { className: "relative flex justify-center text-sm", children: /* @__PURE__ */ jsx("span", { className: "px-2 bg-white dark:bg-gray-900 text-gray-500", children: "Or continue with" }) })
          ] }),
          /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: handleGoogleSignIn,
              disabled: isLoading,
              className: "w-full flex items-center justify-center gap-3 py-2 px-4 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-50",
              children: [
                /* @__PURE__ */ jsxs("svg", { className: "w-5 h-5", viewBox: "0 0 24 24", children: [
                  /* @__PURE__ */ jsx(
                    "path",
                    {
                      fill: "currentColor",
                      d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "path",
                    {
                      fill: "currentColor",
                      d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "path",
                    {
                      fill: "currentColor",
                      d: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "path",
                    {
                      fill: "currentColor",
                      d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    }
                  )
                ] }),
                "Continue with Google"
              ]
            }
          ),
          /* @__PURE__ */ jsx("div", { className: "mt-4 text-center", children: /* @__PURE__ */ jsx("button", { onClick: handleDemoLogin, className: "text-sm text-gray-500 hover:text-primary-600 underline", children: "Try Demo Session" }) }),
          /* @__PURE__ */ jsx("div", { className: "mt-6 text-center text-sm", children: /* @__PURE__ */ jsx("button", { onClick: () => {
            setIsRegistering(!isRegistering);
            resetForm();
          }, className: "font-semibold text-primary-600 hover:text-primary-500", children: isRegistering ? "Already have an account? Sign In" : "Don't have an account? Register" }) })
        ] });
      case "select_business":
        return /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("div", { className: "text-center mb-6", children: [
            /* @__PURE__ */ jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: "Select Your Business" }),
            /* @__PURE__ */ jsxs("p", { className: "mt-2 text-sm text-gray-600 dark:text-gray-400", children: [
              "Welcome back, ",
              loggedInUser?.name,
              "!"
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "space-y-3", children: userBusinesses.map((business) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 group", children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => handleSelectBusiness(business.id),
                className: "flex-1 text-left p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:border-gray-700 font-semibold transition-colors",
                children: business.name
              }
            ),
            onDeleteBusiness && /* @__PURE__ */ jsx(
              "button",
              {
                onClick: (e) => {
                  e.stopPropagation();
                  setDeletingBusinessId(business.id);
                },
                className: "p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity",
                title: "Delete Business",
                children: /* @__PURE__ */ jsx(Icon, { name: "trash", className: "w-5 h-5" })
              }
            )
          ] }, business.id)) }),
          deletingBusinessId && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4", children: /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm w-full text-center", children: [
            /* @__PURE__ */ jsx("h3", { className: "text-lg font-bold text-red-600", children: "Delete Business" }),
            /* @__PURE__ */ jsxs("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-2", children: [
              'Are you sure you want to delete "',
              userBusinesses.find((a) => a.id === deletingBusinessId)?.name,
              '"? This action cannot be undone.'
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex justify-center gap-4 mt-6", children: [
              /* @__PURE__ */ jsx("button", { onClick: () => setDeletingBusinessId(null), className: "px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition", children: "Cancel" }),
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: async () => {
                    if (onDeleteBusiness && deletingBusinessId && loggedInUser) {
                      const success = await onDeleteBusiness(loggedInUser.accountId, deletingBusinessId);
                      if (success) {
                        setUserBusinesses((prev) => prev.filter((a) => a.id !== deletingBusinessId));
                        setDeletingBusinessId(null);
                      }
                    }
                  },
                  className: "px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition font-semibold",
                  children: "Delete"
                }
              )
            ] })
          ] }) }),
          /* @__PURE__ */ jsx("div", { className: "mt-6 text-center", children: /* @__PURE__ */ jsx("button", { onClick: () => setStep("create_business"), className: "font-semibold text-primary-600 hover:text-primary-500", children: "+ Create a new business" }) }),
          /* @__PURE__ */ jsx("div", { className: "mt-6 text-center text-sm", children: /* @__PURE__ */ jsx("button", { onClick: () => {
            setStep("auth");
            resetForm();
            setLoggedInUser(null);
          }, className: "text-gray-500 hover:underline", children: "Log out" }) })
        ] });
      case "create_business":
        return /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("div", { className: "text-center mb-6", children: [
            /* @__PURE__ */ jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: userBusinesses.length > 0 ? "Create a New Business" : "Create Your First Business" }),
            /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-gray-600 dark:text-gray-400", children: "First, give your new shop a name." })
          ] }),
          /* @__PURE__ */ jsxs("form", { className: "space-y-4", onSubmit: handleCreateBusinessSubmit, children: [
            /* @__PURE__ */ jsx("input", { value: shopName, onChange: (e) => setShopName(e.target.value), placeholder: "Shop Name", required: true, className: "w-full px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white" }),
            /* @__PURE__ */ jsxs("div", { className: "pt-2", children: [
              /* @__PURE__ */ jsx("label", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300", children: "Select your business type(s):" }),
              /* @__PURE__ */ jsx("div", { className: "mt-2 space-y-2", children: shopTypesData.map((st) => /* @__PURE__ */ jsxs(
                "div",
                {
                  onClick: () => handleShopTypeToggle(st.type),
                  className: `p-3 border-2 rounded-lg cursor-pointer transition-colors relative ${shopTypes.includes(st.type) ? "border-primary-500 bg-primary-50 dark:bg-primary-900/40" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}`,
                  children: [
                    shopTypes.includes(st.type) && /* @__PURE__ */ jsx("div", { className: "absolute top-2 right-2 w-5 h-5 rounded-full bg-primary-500 text-white flex items-center justify-center", children: /* @__PURE__ */ jsx(Icon, { name: "check", className: "w-3 h-3" }) }),
                    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
                      /* @__PURE__ */ jsx("span", { className: "text-2xl", children: st.icon }),
                      /* @__PURE__ */ jsxs("div", { children: [
                        /* @__PURE__ */ jsx("p", { className: "font-bold text-gray-800 dark:text-gray-200", children: st.title }),
                        /* @__PURE__ */ jsx("p", { className: "text-xs text-gray-500 dark:text-gray-400", children: st.description })
                      ] })
                    ] })
                  ]
                },
                st.type
              )) })
            ] }),
            error && /* @__PURE__ */ jsx("p", { className: "text-sm text-center text-red-500", children: error }),
            /* @__PURE__ */ jsx("button", { type: "submit", disabled: isLoading, className: "w-full flex justify-center py-2 px-4 text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50", children: isLoading ? "Creating..." : "Create & Open Business" })
          ] }),
          userBusinesses.length > 0 && /* @__PURE__ */ jsx("div", { className: "mt-6 text-center text-sm", children: /* @__PURE__ */ jsx("button", { onClick: () => setStep("select_business"), className: "text-gray-500 hover:underline", children: "\u2190 Back to business selection" }) })
        ] });
    }
  };
  return /* @__PURE__ */ jsx("div", { className: "min-h-screen bg-gray-100 dark:bg-gray-950", children: /* @__PURE__ */ jsx("div", { className: "flex justify-center items-center min-h-screen", children: /* @__PURE__ */ jsxs("div", { className: "w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex overflow-hidden mx-4 my-8", children: [
    /* @__PURE__ */ jsx(LeftPanel, {}),
    /* @__PURE__ */ jsx(RightPanel, { children: renderContent() })
  ] }) }) });
};
var Login_default = Login;
export {
  Login_default as default
};
