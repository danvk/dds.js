/// <reference path="typings/react/react-global.d.ts" />
/// <reference path="typings/underscore/underscore.d.ts" />

type Props = {
	name: string;
}
class MyComponent extends React.Component<Props, void> {
	render() {
		return <div>Hello {this.props.name}</div>;
	}
}