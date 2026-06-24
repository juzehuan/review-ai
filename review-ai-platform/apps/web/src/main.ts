import { createApp } from "vue";
import {
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Descriptions,
  Drawer,
  Dropdown,
  Empty,
  Form,
  Input,
  InputNumber,
  Layout,
  List,
  Menu,
  Modal,
  Popconfirm,
  Progress,
  Rate,
  Result,
  Segmented,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  Upload
} from "ant-design-vue";
import "ant-design-vue/dist/reset.css";
import App from "./App.vue";
import { router } from "./router";
import "./styles.css";

const app = createApp(App);
[
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Descriptions,
  Drawer,
  Dropdown,
  Empty,
  Form,
  Input,
  InputNumber,
  Layout,
  List,
  Menu,
  Modal,
  Popconfirm,
  Progress,
  Rate,
  Result,
  Segmented,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  Upload
].forEach((component) => app.use(component));

app.use(router).mount("#app");
