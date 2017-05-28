const urlPrefixRegex = /^[a-z]*:/
const getAbsoluteUrl = function(url) {
  if (urlPrefixRegex.test(url)) {
    return url;
  }
  return 'http://' + url;
}
const openPage = (url, target) => window.open(getAbsoluteUrl(url), target);


document.addEventListener('DOMContentLoaded', function(){
  const {Component, createElement: e} = React;
  const cn = className => ({className: className});

  class GotoForm extends Component {
    constructor(props) {
      super(props);
      this.state = {
        url: '',
        openNewTab: true
      };
    }
    handleChange(e, caller) {
      switch (caller) {
        case 'urlChanged':
          this.setState({url: e.target.value});
          break;
        case 'toggleNewTab':
          this.setState({openNewTab: !this.state.openNewTab});
          break;
      }
    }
    handleGoto(e) {
      e.preventDefault();
      let target = this.state.openNewTab ? '_blank': '_self';
      openPage(this.state.url, target);
    }
    render() {
      return e('form', {onSubmit: e => this.handleGoto(e)},
        e('div', cn('form-group form-group-flex'),
          e('input', {
            type: 'text',
            placeholder: 'Enter URL',
            className: 'form-control flex-input',
            value: this.state.url,
            onChange: e => this.handleChange(e, 'urlChanged')
          }),
          e('button', {type: 'submit', className: 'btn btn-primary'}, 'Go')
        ),
        e(
          "div",
          cn('form-group'),
          e(
            "div",
            cn('checkbox'),
            e(
              "label",
              null,
              e("input", {
                type: "checkbox",
                checked: this.state.openNewTab,
                onChange: e => this.handleChange(e, 'toggleNewTab')
              }),
              "Open in new tab"
            )
          )
        )
      );
    }
  }

  ReactDOM.render(e(GotoForm), document.getElementById('react-root'))
});
