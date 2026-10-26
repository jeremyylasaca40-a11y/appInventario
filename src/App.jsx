import CrudProductos from './components/Productos/crudProductos';

function App() {
  return (
    <div>
      <nav className="navbar navbar-dark bg-dark shadow-sm">
        <div className="container">
          <span className="navbar-brand mb-0 h1">SENATI - React CRUD API Rest</span>
        </div>
      </nav>
      <CrudProductos />
    </div>
  );
}

export default App;
