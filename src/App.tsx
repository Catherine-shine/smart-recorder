import { Provider } from "react-redux";
import { store } from "./store";


function App() {
  return (
    <Provider store={store}>
      <div
        style={{
          width: "100vw",
          height: "24px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "24px",
          fontWeight: "bold",
        }}
      >
        smart recorder
      </div>
       
    </Provider>
    
  );
}

export default App;
